const { redis } = require("../config/redis");
const User = require("../models/User.model");
const crypto = require("crypto");
const { verifyMessage } = require("ethers");
const { messageCreator } = require("../helpers/messageCreator");

const users = new Map();

const existingWalletMessage = (wallet) => messageCreator([
  {
    title: "⚠️ *У вас уже есть подключенный кошелек*",
    items: [
      wallet
    ]
  }
], [
  [{ text: "🔌 Отключить кошелек", callback_data: "disconnect" }]
]);

const walletConnectMessage = messageCreator([
  {
    items: [
      "*1.* Откройте ваш криптокошелек",
      "*2.* Подпишите код подтверждения",
      "*3.* Отправьте полученную подпись сюда"
    ]
  },
  {
    items: [
      "*✍️ Ваш код для подписи ↓*"
    ]
  }
]);

const connectedWallet = (wallet)=> messageCreator([
  {
    title: "🎉 *Поздравляем! Кошелек успешно подключен!*",
  },
  {
    title: "📍 *Адрес вашего кошелька:*",
    items: [
      wallet
    ]
  },
  {
    title: "💳 *Основные операции:*",
    items: [
      "/send amount `@user` – Перевести USDT",
      "/invoice amount – Получить USDT",
      "/balance – Проверить баланс",
    ]
  },
])

const errorConnection = messageCreator([
  {
    title: "🔐 *Возникла проблема с подписью*",
  },
  {
    title: "Небольшая проверка:",
    items: [
      "*1.* Код скопирован корректно",
      "*2.* Подпись выполнена верно",
    ]
  },
  {
    title: "💡 Используйте /connect для получения нового кода или повторите подпись",
  },
], [
  [
    { text: "🔗 Подключить кошелек", callback_data: "connect" },
  ]
])


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
    const { text, options } = existingWalletMessage(existingWallet);
    await ctx.replyWithMarkdown(text, options);
    return;
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  users.set(chatId, { nonce });
  await redis.set(`nonce:${chatId}`, nonce, 'EX', 300);

  const { text, options } = walletConnectMessage;

  await ctx.replyWithMarkdown(text, options);
  await ctx.reply(nonce)
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

    const { text, options } = connectedWallet(recoveredAddress);

    await ctx.replyWithMarkdown(text, options);
    users.delete(chatId);
  } catch (error) {
    const { text, options } = errorConnection;

    await ctx.replyWithMarkdown(text, options);
  }
}

module.exports = { connectWallet, catchWalletAddress };
