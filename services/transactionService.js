const { ethers } = require("ethers");
const { ethProvider } = require("../config/providers");
const User = require("../models/User.model");
const logger = require("../config/logger");

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
    await ctx.reply("❌ Использование: /send <сумма> <@username>");
    return;
  }

  const amount = parseFloat(args[1]);
  const username = args[2].replace("@", "");
  const senderId = ctx.from.id;

  const sender = await User.findOne({ where: { telegramId: senderId } });
  if (!sender) {
    await ctx.reply("❌ У вас нет подключенного кошелька. Используйте /connect");
    return;
  }

  const recipient = await User.findOne({ where: { username } });
  if (!recipient) {
    await ctx.reply("❌ Получатель не зарегистрирован. Он должен подключить кошелек с помощью /connect");
    return;
  }

  const senderBalanceWei = await ethProvider.getBalance(sender.walletAddress);
  const senderBalance = ethers.formatEther(senderBalanceWei);
  if (parseFloat(senderBalance) < amount) {
    await ctx.reply(`❌ Недостаточно средств. Ваш баланс: ${senderBalance} ETH`);
    return;
  }

  if (amount > 100) {
    const txData = await generateUnsignedTransaction(senderId, username, amount);
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

  try {
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, ethProvider);
    const tx = await wallet.sendTransaction({
      to: recipient.walletAddress,
      value: ethers.parseEther(amount.toString()),
    });

    await tx.wait();
    await ctx.reply(`✅ Отправлено ${amount} ETH @${username}!\n🔗 [Транзакция](https://etherscan.io/tx/${tx.hash})`);
    logger.info(`Пользователь ${senderId} отправил ${amount} ETH пользователю ${username}. TX: ${tx.hash}`);
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
