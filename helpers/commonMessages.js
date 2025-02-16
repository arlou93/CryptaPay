const { messageCreator } = require("./messageCreator");

const walletNotFoundMessage = messageCreator([
  {
    title: "⚠️ *Кошелек не подключен*",
    items: [
      "Чтобы отправлять и получать криптовалюту, подключите или создайте новый кошелек"
    ]
  }
], [
  [{ text: "Подключить", callback_data: "connect" }],
  [{ text: "Создать", callback_data: "create" }]
]);


module.exports = {
  walletNotFoundMessage: walletNotFoundMessage
};