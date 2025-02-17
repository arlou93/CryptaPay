// services/transactionService/checkWallets.js
const { redis } = require("../../config/redis");
const User = require("../../models/User");
const { walletNotFoundMessage } = require("../../helpers/commonMessages");
const logger = require("../../config/logger");

// Приватная функция для внутреннего использования
async function getWalletsFromCache(userId) {
  try {
    const [evmWallet, tronWallet] = await Promise.all([
      redis.get(`evmWallet:${userId}`),
      redis.get(`tronWallet:${userId}`)
    ]);
    return { evmWallet, tronWallet };
  } catch (error) {
    logger.error(`Ошибка получения кошельков из кэша: ${error.message}`);
    return { evmWallet: null, tronWallet: null };
  }
}

async function checkWallets(ctx, senderId, recipientUsername) {
  try {
    const senderWallets = await getWalletsFromCache(senderId);

    if (!senderWallets.evmWallet && !senderWallets.tronWallet) {
      const user = await User.findOne({ where: { telegramId: senderId } });

      if (!user) {
        await ctx.reply("⚠️ У вас нет активных кошельков, подключите или создайте новый");
        return null;
      }

      senderWallets.evmWallet = user.evmWalletAddress;
      senderWallets.tronWallet = user.tronWalletAddress;

      if (senderWallets.evmWallet) {
        await redis.set(`evmWallet:${senderId}`, senderWallets.evmWallet, "EX", 3600);
      }
      if (senderWallets.tronWallet) {
        await redis.set(`tronWallet:${senderId}`, senderWallets.tronWallet, "EX", 3600);
      }
    }

    // Получаем данные получателя
    const recipient = await User.findOne({ where: { username: recipientUsername } });

    if (!recipient) {
      await ctx.reply(`⚠️ Пользователь @${recipientUsername} не зарегистрирован в боте`);
      return null;
    }

    // Получаем кошельки получателя
    const recipientWallets = await getWalletsFromCache(recipient.telegramId);

    if (!recipientWallets.evmWallet && !recipientWallets.tronWallet) {
      recipientWallets.evmWallet = recipient.evmWalletAddress;
      recipientWallets.tronWallet = recipient.tronWalletAddress;

      if (recipientWallets.evmWallet) {
        await redis.set(`evmWallet:${recipient.telegramId}`, recipientWallets.evmWallet, "EX", 3600);
      }
      if (recipientWallets.tronWallet) {
        await redis.set(`tronWallet:${recipient.telegramId}`, recipientWallets.tronWallet, "EX", 3600);
      }
    }

    if (!senderWallets.evmWallet && !senderWallets.tronWallet) {
      const { text, options } = walletNotFoundMessage;
      await ctx.replyWithMarkdown(text, options);
      return null;
    }

    if (!recipientWallets.evmWallet && !recipientWallets.tronWallet) {
      await ctx.reply(`⚠️ Пользователь @${recipientUsername} не подключил кошелек. Попросите его использовать /connect либо /create`);
      return null;
    }

    return { senderWallets, recipientWallets };
  } catch (error) {
    logger.error(`Ошибка проверки кошельков: ${error.message}`);
    await ctx.reply("⚠️ Произошла ошибка при проверке кошельков. Попробуйте позже.");
    return null;
  }
}

function getWalletForNetwork(wallets, network) {
  return network === "TRON" ? wallets.tronWallet : wallets.evmWallet;
}

module.exports = {
  checkWallets,
  getWalletForNetwork
};