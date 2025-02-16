const { ethers } = require("ethers");
const { ethProvider, bscProvider, polygonProvider, tronProvider } = require("../config/providers");
const User = require("../models/User.model");
const { redis } = require("../config/redis");
const logger = require("../config/logger");
const { getBestNetwork } = require("./networkService");
const { walletNotFoundMessage } = require("../helpers/commonMessages");

const CACHE_EXPIRATION = 3600; // Время жизни кэша в секундах
const MAX_AUTO_TRANSACTION = 100; // Максимальная сумма для автоматической отправки
const GAS_LIMIT = 21000; // Стандартный лимит газа для ETH транзакций

async function generateUnsignedTransaction(senderId, username, amount, network) {
  try {
    // Получаем данные отправителя и получателя
    const [sender, recipient] = await Promise.all([
      User.findOne({ where: { telegramId: senderId } }),
      User.findOne({ where: { username } })
    ]);

    if (!sender || !recipient) {
      return { success: false, error: "⚠️ Один из пользователей не найден" };
    }

    // Выбор провайдера в зависимости от сети
    const provider = {
      ETH: ethProvider,
      BSC: bscProvider,
      POLYGON: polygonProvider
    }[network];

    if (!provider) {
      return { success: false, error: "⚠️ Неподдерживаемая сеть" };
    }

    // Проверка баланса
    const senderBalanceWei = await provider.getBalance(sender.evmWalletAddress);
    const senderBalance = ethers.formatEther(senderBalanceWei);

    if (parseFloat(senderBalance) < amount) {
      return {
        success: false,
        error: `💰 Недостаточно средств. Баланс: ${senderBalance} ${network}`
      };
    }

    // Получение необходимых данных для транзакции
    const [nonce, feeData, network] = await Promise.all([
      provider.getTransactionCount(sender.evmWalletAddress),
      provider.getFeeData(),
      provider.getNetwork()
    ]);

    // Формирование транзакции
    const tx = {
      to: recipient.evmWalletAddress,
      value: ethers.parseEther(amount.toString()).toString(),
      gasLimit: ethers.toNumber(GAS_LIMIT),
      gasPrice: feeData.gasPrice.toString(),
      nonce,
      chainId: network.chainId,
    };

    return { success: true, tx };
  } catch (error) {
    logger.error(`⚠️ Ошибка генерации транзакции: ${error.message}`);
    return { success: false, error: "Ошибка при создании транзакции" };
  }
}

async function getRecipientWallet(username, bestNetwork) {
  // Получаем данные из кэша
  const [recipientWallet, recipientTronWallet] = await Promise.all([
    redis.get(`evmWallet:${username}`),
    redis.get(`tronWallet:${username}`)
  ]);

  // Если нет в кэше, ищем в базе
  if (!recipientWallet && !recipientTronWallet) {
    const recipient = await User.findOne({ where: { username } });
    if (!recipient) return null;

    // Кэшируем найденные адреса
    const cachePromises = [];
    if (recipient.evmWalletAddress) {
      cachePromises.push(
        redis.set(`evmWallet:${username}`, recipient.evmWalletAddress, "EX", CACHE_EXPIRATION)
      );
    }
    if (recipient.tronWalletAddress) {
      cachePromises.push(
        redis.set(`tronWallet:${username}`, recipient.tronWalletAddress, "EX", CACHE_EXPIRATION)
      );
    }
    await Promise.all(cachePromises);

    return determineWalletNetwork(
      recipient.evmWalletAddress,
      recipient.tronWalletAddress,
      bestNetwork
    );
  }

  return determineWalletNetwork(recipientWallet, recipientTronWallet, bestNetwork);
}

function determineWalletNetwork(evmWallet, tronWallet, bestNetwork) {
  if (bestNetwork === "TRON" && tronWallet) {
    return { address: tronWallet, network: "TRON" };
  }
  if (["ETH", "BSC", "POLYGON"].includes(bestNetwork) && evmWallet) {
    return { address: evmWallet, network: "EVM" };
  }
  return evmWallet ? { address: evmWallet, network: "EVM" } :
    tronWallet ? { address: tronWallet, network: "TRON" } : null;
}

async function handleTransaction(ctx) {
  try {
    const args = ctx.message.text.split(" ");
    if (args.length !== 3) {
      await ctx.reply("👉 Пример отправки: /send <сумма> @username");
      return;
    }

    const amount = parseFloat(args[1]);
    const username = args[2].replace("@", "");
    const senderId = ctx.from.id;

    if (username === ctx.from.username) {
      await ctx.reply("⚠️ Нельзя отправить USDT самому себе");
      return;
    }

    // Проверяем валидность суммы
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply("⚠️ Пожалуйста, укажите корректную сумму");
      return;
    }

    // Получаем кошельки отправителя
    const [senderWallet, senderTronWallet] = await Promise.all([
      redis.get(`evmWallet:${senderId}`),
      redis.get(`tronWallet:${senderId}`)
    ]);

    if (!senderWallet && !senderTronWallet) {
      const sender = await User.findOne({ where: { telegramId: senderId } });
      if (!sender || (!sender.evmWalletAddress && !sender.tronWalletAddress)) {
        const { text, options } = walletNotFoundMessage;
        await ctx.replyWithMarkdown(text, options);
        return;
      }

      // Кэшируем кошельки отправителя
      if (sender.evmWalletAddress) {
        await redis.set(`evmWallet:${senderId}`, sender.evmWalletAddress, "EX", CACHE_EXPIRATION);
      }
      if (sender.tronWalletAddress) {
        await redis.set(`tronWallet:${senderId}`, sender.tronWalletAddress, "EX", CACHE_EXPIRATION);
      }
    }

    const bestNetwork = await getBestNetwork();
    const recipientWallet = await getRecipientWallet(username, bestNetwork);

    if (!recipientWallet) {
      await ctx.reply("⚠️ Этот пользователь пока не подключил кошелек к боту. Попросите его использовать /connect либо /create");
      return;
    }

    // Обработка TRON транзакций
    if (bestNetwork === "TRON") {
      await handleTronTransaction(ctx, amount, username, senderTronWallet, recipientWallet.address);
      return;
    }

    // Обработка EVM транзакций
    await handleEvmTransaction(ctx, amount, username, senderWallet, recipientWallet, bestNetwork);

  } catch (error) {
    logger.error(`Ошибка в handleTransaction: ${error.message}`);
    await ctx.reply("⚠️ Произошла ошибка при обработке транзакции. Попробуйте позже.");
  }
}

async function handleTronTransaction(ctx, amount, username, senderWallet, recipientAddress) {
  try {
    const senderBalance = await tronProvider.trx.getBalance(senderWallet);
    const amountTron = tronProvider.toSun(amount);

    if (senderBalance < amountTron) {
      await ctx.reply(`💰 Недостаточно TRX. Баланс: ${senderBalance / 1e6} TRX`);
      return;
    }

    const tx = await tronProvider.transactionBuilder.sendTrx(
      recipientAddress,
      amountTron,
      senderWallet
    );
    const signedTx = await tronProvider.trx.sign(tx);
    const result = await tronProvider.trx.sendRawTransaction(signedTx);

    if (result.result) {
      await ctx.reply(
        `💸 ${amount} USDT отправлено через Tron (TRC-20) @${username}!\n` +
        `🔍 [Посмотреть в TronScan](https://tronscan.org/#/transaction/${result.txid})`
      );
      logger.info(`Успешная Tron транзакция: ${senderId} -> ${username}, amount: ${amount}, tx: ${result.txid}`);
    } else {
      throw new Error("Транзакция не прошла");
    }
  } catch (error) {
    logger.error(`Ошибка Tron транзакции: ${error.message}`);
    await ctx.reply("🔄 Сеть Tron перегружена. Попробуйте позже.");
  }
}

async function handleEvmTransaction(ctx, amount, username, senderWallet, recipientWallet, network) {
  const provider = {
    ETH: ethProvider,
    BSC: bscProvider,
    POLYGON: polygonProvider
  }[network];

  // Проверка баланса
  const senderBalanceWei = await provider.getBalance(senderWallet);
  const senderBalance = ethers.formatEther(senderBalanceWei);

  if (parseFloat(senderBalance) < amount) {
    await ctx.reply(`💰 Недостаточно средств. Баланс в ${network}: ${senderBalance}`);
    return;
  }

  // Для больших сумм генерируем неподписанную транзакцию
  if (amount > MAX_AUTO_TRANSACTION) {
    const txData = await generateUnsignedTransaction(ctx.from.id, username, amount, network);
    if (!txData.success) {
      await ctx.reply(txData.error);
      return;
    }

    await ctx.reply(
      `🔐 *Подпишите транзакцию в MetaMask/WalletConnect*\n\n` +
      `📄 *Raw Transaction JSON:*\n\`${JSON.stringify(txData.tx, null, 2)}\`\n\n` +
      `1️⃣ Скопируйте JSON\n` +
      `2️⃣ Подпишите в MetaMask\n` +
      `3️⃣ Отправьте подписанную транзакцию в чат`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  // Для малых сумм отправляем автоматически
  try {
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const tx = await wallet.sendTransaction({
      to: recipientWallet.address,
      value: ethers.parseEther(amount.toString()),
    });

    await tx.wait();
    const explorerUrl = {
      ETH: "etherscan.io",
      BSC: "bscscan.com",
      POLYGON: "polygonscan.com"
    }[network];

    await ctx.reply(
      `✅ Отправлено ${amount} USDT через ${network} @${username}!\n` +
      `🔗 [Транзакция](https://${explorerUrl}/tx/${tx.hash})`
    );
    logger.info(`Успешная ${network} транзакция: ${ctx.from.id} -> ${username}, amount: ${amount}, tx: ${tx.hash}`);
  } catch (error) {
    logger.error(`Ошибка ${network} транзакции: ${error.message}`);
    await ctx.reply("⚠️ Ошибка при переводе. Попробуйте позже.");
  }
}

module.exports = { handleTransaction };