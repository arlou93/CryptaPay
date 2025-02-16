const { messageCreator } = require("../../helpers/messageCreator");
const feesMessage = messageCreator([
  {
    title: "💰 *Комиссия за переводы*",
    items: [
      "Бот автоматически выбирает *самую дешевую сеть* для перевода. К каждой транзакции добавляется *небольшая сервисная комиссия*. Вы всегда видите итоговую сумму *до подтверждения перевода*.",
    ]
  },
  {
    title: "📊 *Пример расчета комиссии*",
    items: [
      "Вы отправляете: 10 USDT",
      "Выбранная сеть: Tron (TRC-20)",
      "Комиссия бота: 0.15 USDT",
      "Получатель получит: 9.85 USDT"
    ]
  },
], [
  [{ text: "🔙 Назад", callback_data: "help" }]
]);

async function feesCommand(ctx) {
  const { text, options } = feesMessage;
  await ctx.replyWithMarkdown(text, options);
}

module.exports = { feesCommand };
