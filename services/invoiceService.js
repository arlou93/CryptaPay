const { messageCreator } = require("../helpers/messageCreator");
const User = require("../models/User.model");

async function generateInvoice(ctx) {
  const args = ctx.message.text.split(" ");
  if (args.length !== 2 || isNaN(parseFloat(args[1]))) {
    await ctx.reply("❌ Используйте команду так: `/invoice <сумма>`", { parse_mode: "Markdown" });
    return;
  }

  const amount = parseFloat(args[1]);
  if (amount <= 0) {
    await ctx.reply("❌ Сумма счета должна быть больше 0.", { parse_mode: "Markdown" });
    return;
  }

  const senderId = ctx.from.id;
  const senderUsername = ctx.from.username || `user_${senderId}`;

  const user = await User.findOne({ where: { telegramId: senderId } });
  if (!user || !user.walletAddress) {
    const message = {
      text: "⚠️ *У вас нет подключенных кошельков*",
      options: {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Подключить", callback_data: "connect" }],
            [{ text: "Создать", callback_data: "create" }]
          ]
        }
      }
    }

    await ctx.replyWithMarkdown(message.text, message.options);
    return;
  }

  // 1️⃣ Сообщение для отправителя (подсказка)
  const senderMessage = messageCreator([
    {
      items: ["*Счет создан!* Перешлите сообщение ниже тому, кто должен оплатить ↓"]
    }
  ]);

  const receiverMessage = messageCreator([
    {
      title: `🧾 *Счет на оплату от @${senderUsername}*`,
      items: [
        `💰 *Сумма:* ${amount} USDT`,
        `💡 Для оплаты скопируйте команду ниже и отправьте её в боте:\n`,
        `\`/send ${amount} @${senderUsername}\``
      ]
    }
  ], [
    [{ text: "💸 Оплатить в боте", url: `https://t.me/${ctx.me}` }]
  ]);

  await ctx.replyWithMarkdown(senderMessage.text, senderMessage.options);
  await ctx.replyWithMarkdown(receiverMessage.text, receiverMessage.options);
}

module.exports = { generateInvoice };
