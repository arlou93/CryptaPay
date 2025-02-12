const User = require("../models/User.model");
const { redis } = require("../config/redis");

async function disconnectWallet(ctx) {
  const chatId = ctx.from.id;

  const existingUser = await User.findOne({ where: { telegramId: chatId } });
  if (!existingUser) {
    await ctx.reply(
      `*❌ Кошелек не найден*\n\n` +
      `У вас нет подключенного кошелька.\n` +
      `Используйте /connect чтобы подключить существующий\n` +
      `или /create чтобы создать новый.`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  await User.destroy({ where: { telegramId: chatId } });
  await redis.del(`wallet:${chatId}`);

  await ctx.reply(
    `*✅ Кошелек успешно отключен*\n\n` +
    `Теперь вы можете:\n` +
    `🔸 Подключить другой кошелек: /connect\n` +
    `🔸 Создать новый кошелек: /create`,
    { parse_mode: 'Markdown' }
  );
}

module.exports = { disconnectWallet };
