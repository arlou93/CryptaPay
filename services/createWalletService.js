const { redis } = require("../config/redis");
const User = require("../models/User.model");
const { Wallet } = require("ethers");

async function createWallet(ctx) {
  const chatId = ctx.from.id;
  const username = ctx.from.username || null;

  let existingWallet = await redis.get(`wallet:${chatId}`);
  if (!existingWallet) {
    const user = await User.findOne({ where: { telegramId: chatId } });
    if (user) {
      existingWallet = user.walletAddress;
      await redis.set(`wallet:${chatId}`, existingWallet, 'EX', 3600);
    }
  }

  if (existingWallet) {
    await ctx.reply(
      `*⚠️ У вас уже есть активный кошелек*\n\n` +
      `Текущий адрес:\n\`${existingWallet}\`\n\n` +
      `Для создания нового:\n` +
      `1️⃣ Сначала отключите текущий через /disconnect\n` +
      `2️⃣ Затем создайте новый кошелек`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  try {
    const wallet = Wallet.createRandom();
    await User.create({ telegramId: chatId, walletAddress: wallet.address, username });
    await redis.set(`wallet:${chatId}`, wallet.address, 'EX', 3600);

    await ctx.reply(
      `*🎉 Поздравляем! Ваш новый кошелек создан*\n\n` +
      `📍 *Адрес кошелька:*\n\`${wallet.address}\`\n\n` +
      `*⚠️ ВАЖНО: Сохраните приватный ключ*\n` +
      `• Храните его в надежном месте\n` +
      `• Никому не передавайте\n` +
      `• Потеря ключа = потеря доступа к кошельку\n\n` +
      `*Ваш приватный ключ:*`,
      { parse_mode: 'Markdown' }
    );
    await ctx.reply(wallet.privateKey);
  } catch (error) {
    await ctx.reply(
      `*❌ Упс! Что-то пошло не так*\n\n` +
      `Не удалось создать кошелек.\n` +
      `Пожалуйста, попробуйте позже или обратитесь в поддержку.`,
      { parse_mode: 'Markdown' }
    );
  }
}

module.exports = { createWallet };
