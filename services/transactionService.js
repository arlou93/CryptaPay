const { ethers } = require("ethers");
const { ethProvider, bscProvider } = require("../config/providers");
const User = require("../models/User.model");
const logger = require("../config/logger");

async function sendTransaction(privateKey, recipient, amount, network) {
  try {
    let provider;
    if (network === 'ETH') {
      provider = ethProvider;
    } else if (network === 'BSC') {
      provider = bscProvider;
    } else {
      throw new Error('Сеть не поддерживается');
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const amountWei = ethers.parseEther(amount.toString());

    const tx = await wallet.sendTransaction({
      to: recipient,
      value: amountWei,
    });

    await tx.wait();
    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error('Ошибка при отправке транзакции:', error);
    return { success: false, error: error.message };
  }
}

async function sendCryptoTransaction(ctx) {
  const args = ctx.message.text.split(' ');
  if (args.length !== 3) {
    await ctx.reply('❌ Использование: /send <сумма> <@username>');
    return;
  }

  const amount = parseFloat(args[1]);
  const username = args[2].replace('@', '');
  const senderId = ctx.from.id;

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
      `3️⃣ Отправьте подписанную транзакцию мне\n\n` +
      `💡 Или используйте QR-код (сканируйте в MetaMask)`,
      { parse_mode: "Markdown" }
    );

    return;
  }

  try {
    const sender = await User.findOne({ where: { telegramId: senderId } });
    const recipient = await User.findOne({ where: { username } });

    if (!sender || !recipient) {
      await ctx.reply('❌ Получатель не зарегистрирован. Он должен подключить кошелек с помощью /connect');
      return;
    }

    const balanceWei = await ethProvider.getBalance(sender.walletAddress);
    const balanceEth = ethers.formatEther(balanceWei);

    if (parseFloat(balanceEth) < amount) {
      await ctx.reply(`❌ Недостаточно средств. Ваш баланс ${balanceEth} ETH`);
      return;
    }

    const txResult = await sendTransaction(process.env.PRIVATE_KEY, recipient.walletAddress, amount, 'ETH');

    if (!txResult.success) {
      await ctx.reply('❌ Ошибка при отправке транзакции: ' + txResult.error);
      return;
    }

    await ctx.reply(`✅ Переведено ${amount} ETH пользователю @${username}.\n\n🔗 [Транзакция в блокчейне](https://etherscan.io/tx/${txResult.txHash})`);
    logger.info(`Пользователь ${senderId} отправил ${amount} ETH пользователю ${username}. TX: ${txResult.txHash}`);
  } catch (error) {
    logger.error(`Ошибка перевода от ${senderId} пользователю ${username}: ${error.message}`);
    await ctx.reply('❌ Ошибка при переводе. Попробуйте позже.');
  }
}

module.exports = { sendCryptoTransaction };
