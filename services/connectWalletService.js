const { redis } = require("../config/redis");
const User = require("../models/User.model");
const crypto = require("crypto");
const { verifyMessage } = require("ethers");

const users = new Map();

async function connectWallet(ctx) {
  const chatId = ctx.from.id;
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
      `*⚠️ Внимание!*\n\n` +
      `У вас уже есть активный кошелек:\n` +
      `\`${existingWallet}\`\n\n` +
      `Чтобы подключить новый кошелек:\n` +
      `1️⃣ Сначала отключите текущий через /disconnect\n` +
      `2️⃣ Затем повторите попытку подключения`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  users.set(chatId, { nonce });
  await redis.set(`nonce:${chatId}`, nonce, 'EX', 300);

  await ctx.reply(
    `*🔐 Подключение кошелька*\n\n` +
    `1️⃣ Скопируйте код подтверждения ниже\n` +
    `2️⃣ Подпишите его в вашем криптокошельке\n` +
    `3️⃣ Отправьте подпись в ответном сообщении\n\n` +
    `*Ваш код для подписи:*`,
    { parse_mode: 'Markdown' }
  );
  await ctx.reply(`\`${nonce}\``, { parse_mode: 'Markdown' });
}

async function catchWalletAddress(ctx) {
  const chatId = ctx.from.id;
  const username = ctx.from.username || null;
  const user = users.get(chatId);

  if (!user || !ctx.message.text) {
    return;
  }

  try {
    const signature = ctx.message.text.trim();
    const recoveredAddress = verifyMessage(user.nonce, signature);

    await User.create({ telegramId: chatId, walletAddress: recoveredAddress, username });

    await ctx.reply(
      `*🎉 Поздравляем!*\n\n` +
      `*✅ Кошелек успешно подключен*\n\n` +
      `📍 *Адрес вашего кошелька:*\n` +
      `\`${recoveredAddress}\`\n\n` +
      `*Доступные команды:*\n` +
      `💸 /send - отправить криптовалюту\n` +
      `❌ /disconnect - отключить кошелек\n\n` +
      `Приятного использования! 🚀`,
      { parse_mode: 'Markdown' }
    );
    users.delete(chatId);
  } catch (error) {
    await ctx.reply(
      `*❌ Ошибка подписи*\n\n` +
      `Пожалуйста, проверьте:\n` +
      `1️⃣ Правильность скопированного кода\n` +
      `2️⃣ Корректность подписи\n\n` +
      `Попробуйте снова или используйте /connect для получения нового кода.`,
      { parse_mode: 'Markdown' }
    );
  }
}

module.exports = { connectWallet, catchWalletAddress };
