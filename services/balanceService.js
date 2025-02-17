const User = require("../models/User");
const { ethers } = require("ethers");
const { ethProvider, bscProvider, polygonProvider } = require("../config/providers");
const { tronProvider } = require("../config/providers");
const { redis } = require("../config/redis");
const logger = require("../config/logger");
const { walletNotFoundMessage } = require("../helpers/commonMessages");

async function getBalance(ctx) {
  const chatId = ctx.from.id;

  try {
    let evmWallet = await redis.get(`evmWallet:${chatId}`);
    let tronWallet = await redis.get(`tronWallet:${chatId}`);

    if (!evmWallet || !tronWallet) {
      const user = await User.findOne({ where: { telegramId: chatId } });

      if (!user) {
        const { text, options } = walletNotFoundMessage;
        await ctx.replyWithMarkdown(text, options);
        return;
      }

      evmWallet = user.evmWalletAddress || null;
      tronWallet = user.tronWalletAddress || null;

      if (evmWallet) await redis.set(`evmWallet:${chatId}`, evmWallet, 'EX', 3600);
      if (tronWallet) await redis.set(`tronWallet:${chatId}`, tronWallet, 'EX', 3600);
    }

    if (!evmWallet && !tronWallet) {
      const { text, options } = {
        noWallets: {
          text: "⚠️ *У вас нет подключенных кошельков*",
          options: {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "Подключить", callback_data: "connect" }],
                [{ text: "Создать", callback_data: "create" }]
              ]
            }
          }
        }
      }

      await ctx.replyWithMarkdown(text, options);
      return;
    }

    let balanceMessage = `💰 *Ваши активы*\n`;

    if (evmWallet) {
      try {
        const balanceEth = ethers.formatEther(await ethProvider.getBalance(evmWallet));
        const balanceBsc = ethers.formatEther(await bscProvider.getBalance(evmWallet));
        const balancePolygon = ethers.formatEther(await polygonProvider.getBalance(evmWallet));

        balanceMessage += `\n*EVM*`;
        balanceMessage += `\n└ Ethereum: ${balanceEth} ETH`;
        balanceMessage += `\n└ BSC: ${balanceBsc} BNB`;
        balanceMessage += `\n└ Polygon: ${balancePolygon} MATIC\n`;
      } catch (error) {
        logger.error(`Ошибка получения баланса в EVM: ${error.message}`);
        balanceMessage += `\n⚠️ Ошибка запроса баланса в EVM\n`;
      }
    }

    if (tronWallet) {
      try {
        const balanceTrx = await tronProvider.trx.getBalance(tronWallet);
        balanceMessage += `\n*TRON*`;
        balanceMessage += `\n└ TRX: ${balanceTrx / 1e6} TRX`;
      } catch (error) {
        logger.error(`Ошибка получения баланса в Tron: ${error.message}`);
        balanceMessage += `\n⚠️ Ошибка запроса баланса в Tron`;
      }
    }

    await ctx.reply(balanceMessage, { parse_mode: "Markdown" });
    logger.info(`Пользователь ${chatId} запросил баланс.`);
  } catch (error) {
    logger.error(`Ошибка получения баланса для пользователя ${chatId}: ${error.message}`);
    await ctx.reply("⚠️ Ошибка получения баланса. Попробуйте позже.");
  }
}

module.exports = { getBalance };
