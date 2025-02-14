const { redis } = require("../config/redis");
const User = require("../models/User.model");
const { Wallet } = require("ethers");
const { messageCreator } = require("../helpers/messageCreator");

const createdWallet = (wallet )=> messageCreator([
  {
    title: "🎉 *Поздравляем! Ваш новый кошелек создан!*",
  },
  {
    title: "📍 *Адрес кошелька:*",
    items: [
      wallet
    ]
  },
  {
    title: "⚠️ *ВАЖНО: Сохраните приватный ключ!*",
    items: [
      "🔹 Храните его в надежном месте",
      "🔹 Никому не передавайте",
      "🔹 Потеря ключа = потеря доступа к кошельку"
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
  {
    title: "🔑 *Ваш приватный ключ ↓*"
  }
])

const walletExistsMessage = (existingWallet) => messageCreator([
  {
    title: "⚠️ *У вас уже есть активный кошелек*",
  },
  {
    title: `📍 *Текущий адрес:* \n${existingWallet}`,
  },
  {
    title: "Чтобы создать новый кошелек:",
    items: [
      "*1.* Отключите текущий → `/disconnect`",
      "*2.* Создайте новый → `/create`"
    ]
  }
]);

const walletCreationErrorMessage = messageCreator([
  {
    title: "❗*Упс! Что-то пошло не так*",
    items: [
      "Не удалось создать кошелек.",
      "Пожалуйста, попробуйте позже или обратитесь в поддержку."
    ]
  }
], [
  [{ text: "💬 Связаться с поддержкой", url: "https://t.me/cryptapaysupport" }]
]);

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
    const { text, options} = walletExistsMessage(existingWallet);
    await ctx.replyWithMarkdown(text, options);

    return;
  }

  try {
    const wallet = Wallet.createRandom();
    await User.create({ telegramId: chatId, walletAddress: wallet.address, username });
    await redis.set(`wallet:${chatId}`, wallet.address, 'EX', 3600);

    const { text, options} = createdWallet(wallet.address);
    await ctx.replyWithMarkdown(text, options);

    await ctx.reply(wallet.privateKey);
  } catch (error) {
    const { text, options} = walletCreationErrorMessage;
    await ctx.replyWithMarkdown(text, options);
  }
}

module.exports = { createWallet };
