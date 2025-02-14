const { ethers } = require("ethers");
const { ethProvider, bscProvider, polygonProvider, tronProvider } = require("../config/providers");
const User = require("../models/User.model");
const logger = require("../config/logger");
const { getBestNetwork } = require("./networkService");
const { walletNotFoundMessage } = require("../helpers/commonMessages");

async function generateUnsignedTransaction(senderId, username, amount) {
  try {
    const sender = await User.findOne({ where: { telegramId: senderId } });
    const recipient = await User.findOne({ where: { username } });

    if (!sender || !recipient) {
      return { success: false, error: "Один из пользователей не найден" };
    }

    const senderBalanceWei = await ethProvider.getBalance(sender.walletAddress);
    const senderBalance = ethers.formatEther(senderBalanceWei);

    if (parseFloat(senderBalance) < amount) {
      return { success: false, error: "Недостаточно средств" };
    }

    const nonce = await ethProvider.getTransactionCount(sender.walletAddress, "latest");
    const feeData = await ethProvider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const amountWei = ethers.parseEther(amount.toString());

    const tx = {
      to: recipient.walletAddress,
      value: amountWei.toString(),
      gasLimit: ethers.toNumber(21000),
      gasPrice: gasPrice.toString(),
      nonce,
      chainId: await ethProvider.getNetwork().then((n) => n.chainId),
    };

    return { success: true, tx };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function sendSignedTransaction(senderId, rawSignedTx) {
  try {
    const sender = await User.findOne({ where: { telegramId: senderId } });
    if (!sender) {
      return { success: false, error: "Пользователь не найден" };
    }

    const txResponse = await ethProvider.sendTransaction(rawSignedTx);
    await txResponse.wait();

    return { success: true, txHash: txResponse.hash };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleTransaction(ctx) {
  const args = ctx.message.text.split(" ");
  if (args.length !== 3) {
    await ctx.reply("👉 Пример отправки: /send <сумма> @username");
    return;
  }

  const amount = parseFloat(args[1]);
  const username = args[2].replace("@", "");
  const senderId = ctx.from.id;

  // 🔹 Check if sender has a registered wallet
  const sender = await User.findOne({ where: { telegramId: senderId } });
  if (!sender) {
    const { text, options } = walletNotFoundMessage
    await ctx.replyWithMarkdown(text, options);
    return;
  }

  // 🔹 Check if recipient exists
  const recipient = await User.findOne({ where: { username } });
  if (!recipient) {
    await ctx.reply("⚠️ Этот пользователь пока не подключил кошелек. Попросите его использовать /connect, чтобы начать переводы.");
    return;
  }

  // 🔹 Determine the cheapest network to use
  const bestNetwork = await getBestNetwork();

  let provider;
  if (bestNetwork === "ETH") provider = ethProvider;
  if (bestNetwork === "BSC") provider = bscProvider;
  if (bestNetwork === "POLYGON") provider = polygonProvider;

  // 🔹 If the chosen network is Tron, we must handle it differently
  if (bestNetwork === "TRON") {
    try {
      const senderBalance = await tronProvider.trx.getBalance(sender.walletAddress);
      const amountTron = tronProvider.toSun(amount); // Convert to TRX format

      if (senderBalance < amountTron) {
        await ctx.reply(`💰 Недостаточно TRX в сети Tron для этой операции. Ваш текущий баланс: ${senderBalance / 1e6} TRX`);
        return;
      }

      const tx = await tronProvider.transactionBuilder.sendTrx(recipient.walletAddress, amountTron, sender.walletAddress);
      const signedTx = await tronProvider.trx.sign(tx);
      const result = await tronProvider.trx.sendRawTransaction(signedTx);

      if (result.result) {
        await ctx.reply(
          `💸 ${amount} USDT отправлено через Tron (TRC-20) @${username}!\n` +
          `🔍 [Посмотреть транзакцию в TronScan](https://tronscan.org/#/transaction/${result.txid})`
        );

        logger.info(`Пользователь ${senderId} отправил ${amount} USDT через Tron пользователю ${username}. TX: ${result.txid}`);
      } else {
        throw new Error("Ошибка при отправке в Tron");
      }
    } catch (error) {
      logger.error(`Ошибка перевода от ${senderId} пользователю ${username} через Tron: ${error.message}`);
      await ctx.reply("🔄 Сеть Tron сейчас перегружена. Повторите перевод чуть позже");
    }
    return;
  }

  // 🔹 Check sender's balance in the chosen EVM network
  const senderBalanceWei = await provider.getBalance(sender.walletAddress);
  const senderBalance = ethers.formatEther(senderBalanceWei);
  if (parseFloat(senderBalance) < amount) {
    await ctx.reply(`💰 Недостаточно средств. Текущий баланс в ${bestNetwork}: ${senderBalance}`);
    return;
  }

  // 🔹 If amount >100 USDT, send unsigned transaction
  if (amount > 100) {
    const txData = await generateUnsignedTransaction(senderId, username, amount, bestNetwork);
    if (!txData.success) {
      await ctx.reply(`❌ Ошибка: ${txData.error}`);
      return;
    }

    await ctx.reply(
      `🔐 *Подпишите транзакцию в MetaMask/WalletConnect*\n\n` +
      `📄 *Raw Transaction JSON:*\n\`${JSON.stringify(txData.tx, null, 2)}\`\n\n` +
      `1️⃣ Скопируйте этот JSON\n` +
      `2️⃣ Подпишите его в MetaMask\n` +
      `3️⃣ Отправьте подписанную транзакцию мне`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  // 🔹 Sending the transaction in the best network
  try {
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const tx = await wallet.sendTransaction({
      to: recipient.walletAddress,
      value: ethers.parseEther(amount.toString()),
    });

    await tx.wait();
    await ctx.reply(
      `✅ Отправлено ${amount} USDT через сеть ${bestNetwork} @${username}!\n🔗 [Транзакция](https://etherscan.io/tx/${tx.hash})`
    );
    logger.info(`Пользователь ${senderId} отправил ${amount} USDT через ${bestNetwork} пользователю ${username}. TX: ${tx.hash}`);
  } catch (error) {
    logger.error(`Ошибка перевода от ${senderId} пользователю ${username}: ${error.message}`);
    await ctx.reply("❌ Ошибка при переводе. Попробуйте позже.");
  }
}

async function handleSignedTransaction(ctx) {
  const senderId = ctx.from.id;
  const rawSignedTx = ctx.message.text.trim();

  if (!rawSignedTx.startsWith("0x")) {
    return;
  }

  const result = await sendSignedTransaction(senderId, rawSignedTx);
  if (!result.success) {
    await ctx.reply(`❌ Ошибка отправки: ${result.error}`);
    return;
  }

  await ctx.reply(`✅ Транзакция успешно отправлена!\n🔗 [Просмотреть в блокчейне](https://etherscan.io/tx/${result.txHash})`);
}

module.exports = { handleTransaction, handleSignedTransaction };
