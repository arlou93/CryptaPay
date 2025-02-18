const User = require("../models/User");
const { ethers } = require("ethers");
const { ethProvider, bscProvider, polygonProvider, tronProvider } = require("../config/providers");
const { redis } = require("../config/redis");
const logger = require("../config/logger");
const { walletNotFoundMessage } = require("../helpers/commonMessages");
const { TRON_USDT_ADDRESS, USDT_ABI, USDT_ADDRESSES } = require("../config/constants");

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
      await ctx.reply("⚠️ У вас нет подключенных кошельков");
      return;
    }

    let balanceMessage = `💰 *Ваши активы*\n`;

    if (evmWallet) {
      try {
        // Получаем балансы нативных токенов
        const [balanceEth, balanceBsc, balancePolygon] = await Promise.all([
          ethProvider.getBalance(evmWallet),
          bscProvider.getBalance(evmWallet),
          polygonProvider.getBalance(evmWallet)
        ]);

        // Получаем балансы USDT
        const [usdtEth, usdtBsc, usdtPolygon] = await Promise.all([
          getUsdtBalance(evmWallet, 'ETH', ethProvider),
          getUsdtBalance(evmWallet, 'BSC', bscProvider),
          getUsdtBalance(evmWallet, 'POLYGON', polygonProvider)
        ]);

        balanceMessage += `\n*Ethereum*`;
        balanceMessage += `\n├ ${ethers.formatEther(balanceEth)} ETH`;
        balanceMessage += `\n└ ${usdtEth} USDT`;

        balanceMessage += `\n\n*BSC*`;
        balanceMessage += `\n├ ${ethers.formatEther(balanceBsc)} BNB`;
        balanceMessage += `\n└ ${usdtBsc} USDT`;

        balanceMessage += `\n\n*Polygon*`;
        balanceMessage += `\n├ ${ethers.formatEther(balancePolygon)} MATIC`;
        balanceMessage += `\n└ ${usdtPolygon} USDT\n`;
      } catch (error) {
        logger.error(`Ошибка получения баланса в EVM: ${error.message}`);
        balanceMessage += `\n⚠️ Ошибка запроса баланса в EVM\n`;
      }
    }

    if (tronWallet) {
      try {
        // Получаем баланс TRX
        const balanceTrx = await tronProvider.trx.getBalance(tronWallet);

        // Получаем баланс USDT
        const tronUsdtContract = await tronProvider.contract().at(TRON_USDT_ADDRESS);
        const balanceUsdt = await tronUsdtContract.methods.balanceOf(tronWallet).call();

        // Явное преобразование BigInt → Number перед делением
        const balanceUsdtNumber = Number(balanceUsdt) / 1e6;
        const balanceTrxNumber = Number(balanceTrx) / 1e6;

        balanceMessage += `\n*TRON*`;
        balanceMessage += `\n├ ${balanceTrxNumber.toFixed(6)} TRX`;
        balanceMessage += `\n└ ${balanceUsdtNumber.toFixed(6)} USDT`;
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

async function getUsdtBalance(address, network, provider) {
  try {
    const usdtAddress = USDT_ADDRESSES[network];
    const usdtContract = new ethers.Contract(usdtAddress, USDT_ABI, provider);
    const balance = await usdtContract.balanceOf(address);
    const decimals = await usdtContract.decimals();
    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    logger.error(`Ошибка получения баланса USDT в ${network}: ${error.message}`);
    return '0.00';
  }
}

module.exports = { getBalance };