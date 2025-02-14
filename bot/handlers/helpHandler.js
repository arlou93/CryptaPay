const { messageCreator } = require("../../helpers/messageCreator");

const helpMessage = messageCreator([
  {
    title: "💳 *Основные операции:*",
    items: [
      "/send amount `@user` – Перевести USDT",
      "/invoice amount – Получить USDT",
      "/balance – Проверить баланс",
    ]
  },
  {
    title: "🔐 *Управление кошельком:*",
    items: [
      "/connect – Подключить кошелек",
      "/create – Создать новый кошелек",
      "/disconnect – Отключить кошелек"
    ]
  },
  {
    title: "✏️ *Примеры:*",
    items: [
      "\`/send 10 @username\`",
      "\`/invoice 50\`"
    ]
  },
], [
  [{ text: "💬 Поддержка 24/7", url: "https://t.me/cryptapaysupport" }]
]);

async function helpHandler(ctx) {
  try {
    const { text, options } = helpMessage;
    await ctx.replyWithMarkdown(text, options);
  } catch (error) {
    console.error('Error:', error);
    await ctx.reply('Произошла ошибка. Попробуйте позже.');
  }
}

module.exports = { helpHandler };