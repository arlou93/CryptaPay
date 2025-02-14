const { messageCreator } = require("../helpers/messageCreator");

const User = require("../models/User.model");
const { redis } = require("../config/redis");
const { walletNotFoundMessage } = require("../helpers/commonMessages");

const walletDisconnectedMessage = messageCreator([
  {
    title: "🔌 *Кошелек успешно отключен*",
    items: [
      "Теперь вы можете подключить новый кошелек или создать новый прямо в боте"
    ]
  }
], [
  [{ text: "🔗 Подключить другой кошелек", callback_data: "connect" }],
  [{ text: "🔑 Создать новый", callback_data: "create" }]
]);

async function disconnectWallet(ctx) {
  const chatId = ctx.from.id;

  const existingUser = await User.findOne({ where: { telegramId: chatId } });
  if (!existingUser) {
    const { text, options } = walletNotFoundMessage

    await ctx.replyWithMarkdown(
      text, options
    );
    return;
  }

  await User.destroy({ where: { telegramId: chatId } });
  await redis.del(`wallet:${chatId}`);

  const { text, options } = walletDisconnectedMessage

  await ctx.replyWithMarkdown(
    text, options
  );
}

module.exports = { disconnectWallet };
