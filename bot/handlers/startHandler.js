const { messageCreator } = require("../../helpers/messageCreator");

const welcomeMessage = (userName) => messageCreator([
  {
    title: `🚀 Привет, *${userName}*!`,
    items: ["Я помогу тебе быстро и безопасно переводить USDT прямо в Telegram."]
  },
  {
    title: "📌 *Что умеет бот?*",
    items: [
      "• Переводы USDT по `@username` — без сложных адресов",
      "• Автоматический выбор сети (Ethereum, BSC, Polygon, Tron)",
      "• Подключение или создание кошелька прямо в боте",
      "• Поддержка MetaMask и других популярных кошельков",
      "• Безопасность и мгновенные платежи"
    ]
  },
  {
    title: "🎯 *Как начать?*",
    items: [
      "/connect — Подключить кошелек",
      "/create — Создать новый",
      "/balance — Проверить баланс",
      "/send <сумма> @user — Отправить USDT",
      "/invoice <сумма> — Получить USDT"
    ]
  }
], [
  [{ text: "📖 Команды и инструкции", callback_data: "help" }],
]);


async function startHandler(ctx) {
  const firstName = ctx.from.first_name || "друг";

  try {
    const { text, options } = welcomeMessage(firstName);
    await ctx.replyWithMarkdown(text, options);
  } catch (error) {
    console.error('Error:', error);
    await ctx.reply('Произошла ошибка. Попробуйте позже.');
  }
}

module.exports = { startHandler };