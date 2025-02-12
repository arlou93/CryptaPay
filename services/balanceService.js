const User = require("../models/User.model");
const { ethers } = require("ethers");
const { ethProvider } = require("../config/providers");
const logger = require("../config/logger");

async function getBalance(ctx) {
  const chatId = ctx.from.id;

  try {
    const user = await User.findOne({ where: { telegramId: chatId } });

    if (!user || !user.walletAddress) {
      await ctx.reply("❌ У вас нет подключенного кошелька. Используйте /connect_wallet.");
      return;
    }

    const balanceWei = await ethProvider.getBalance(user.walletAddress);
    const balanceEth = ethers.formatEther(balanceWei);

    await ctx.reply(`💰 Ваш баланс: ${balanceEth} ETH`);
    logger.info(`Пользователь ${chatId} запросил баланс: ${balanceEth} ETH`);
  } catch (error) {
    logger.error(`Ошибка получения баланса для пользователя ${chatId}: ${error.message}`);
    await ctx.reply("❌ Ошибка получения баланса. Попробуйте позже.");
  }
}

module.exports = { getBalance };
