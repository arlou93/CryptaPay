const { messageCreator } = require("../../helpers/messageCreator");

const helpMessage = messageCreator([
  {
    title: "💸 *Операции с USDT*",
    items: [
      "/send <сумма> `@user` - отправить",
      "/invoice <сумма> - запросить",
      "/balance - проверить баланс",
    ]
  },
  {
    title: "🔑 *Управление Кошельком*",
    items: [
      "/connect - подключить свой кошелек",
      "/create - создать новый кошелек",
      "/disconnect - отключить кошелек",
    ]
  },
  {
    title: "ℹ️ *Важно Знать*",
    items: [
      "• бот выбирает *наиболее выгодную сеть* (ETH, BSC, Polygon, Tron)",
      "• комиссия отображается перед переводом /fees",
      "• переводы *до 100 USDT* выполняются мгновенно",
      "• для сумм *свыше 100 USDT* требуется подпись в MetaMask",
    ]
  }
], [
  [
    { text: "👥 Сообщество", url: "https://t.me/cryptapaycom" }
  ],
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