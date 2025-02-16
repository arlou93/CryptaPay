const { messageCreator } = require("./messageCreator");

const walletNotFoundMessage = messageCreator([
  {
    title: "💡 *Кошелек не подключен*",
    items: [
      "Вы пока не подключили кошелек к боту.",
      "Чтобы отправлять и получать криптовалюту, подключите существующий или создайте новый."
    ]
  }
], [
  [{ text: "🔗 Подключить кошелек", callback_data: "connect" }],
  [{ text: "🔑 Создать новый", callback_data: "create" }]
]);


module.exports = {
  walletNotFoundMessage: walletNotFoundMessage
};