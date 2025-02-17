const { messageCreator } = require("../../helpers/messageCreator");

const welcomeMessage = messageCreator([
  {
    title: "*Что умеет этот бот?*",
  },
  {
    title: "🚀 *Отправляйте и получайте USDT* без сложных адресов и лишних действий. Просто укажи @username получателя, и перевод будет выполнен в *самой выгодной* сети _(Ethereum, BSC, Polygon, TRON)_ с *минимальной комиссией*",
  },
  {
    title: "👉 Нажмите *Подробнее*, чтобы узнать о командах и начать пользоваться ботом"
  }
], [
  [{ text: " 📖 Подробнее", callback_data: "help" }]
]);


async function startHandler(ctx) {
  try {
    const { text, options } = welcomeMessage
    await ctx.replyWithMarkdown(text, options);
  } catch (error) {
    console.error('Error:', error);
    await ctx.reply('Произошла ошибка. Попробуйте позже.');
  }
}

module.exports = { startHandler };
