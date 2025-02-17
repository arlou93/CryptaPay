const logger = require("../config/logger");
const { redis } = require("../config/redis");
const { getBestNetwork, getProvider, getExplorerUrl } = require("./transactionService/networkService");
const {
  calculateServiceFee,
  calculateNetworkFee,
  getWalletBalance,
  getTransactionConfirmMessage
} = require("./transactionService/feeService");
const { checkWallets, getWalletForNetwork } = require("./transactionService/checkWallets");
const { executeTransaction, prepareUnsignedTransaction } = require("./transactionService/transactionExecutor");
const FEE_CONFIG = require("../config/feeConfig");

async function validateInput(ctx) {
  const args = ctx.message.text.split(" ");
  if (args.length !== 3) {
    return {
      success: false,
      message: "👉 Пример: /send <сумма> @username"
    };
  }

  const amount = parseFloat(args[1]);
  const username = args[2].replace("@", "");
  const senderId = ctx.from.id;

  if (isNaN(amount)) {
    return {
      success: false,
      message: "⚠️ Введите число"
    };
  }

  if (amount <= 0) {
    return {
      success: false,
      message: "⚠️ Некорректная сумма. Введите положительное число."
    };
  }

  return {
    success: true,
    data: { amount, username, senderId }
  };
}

async function handleSuccessfulTransaction(ctx, result) {
  const explorerUrl = getExplorerUrl(result.network, result.txHash);
  await ctx.reply(
    `✅ Транзакция успешно отправлена!\n\n` +
    `📎 Просмотреть в эксплорере: ${explorerUrl}\n\n` +
    `🔍 Хэш транзакции: \`${result.txHash}\``,
    { parse_mode: "Markdown" }
  );
}

async function executeAutoTransaction(ctx, txData) {
  const result = await executeTransaction(txData);

  if (result.success) {
    await handleSuccessfulTransaction(ctx, result);
    // Очищаем данные транзакции после успешного выполнения
    await redis.del(`pending_tx:${ctx.from.id}`);
  } else {
    await ctx.reply(`⚠️ Ошибка при отправке транзакции: ${result.error}`);
  }
}

async function prepareManualTransaction(ctx, txData) {
  try {
    const { tx, network } = await prepareUnsignedTransaction(txData);

    // Сохраняем неподписанную транзакцию для последующего использования
    await redis.set(
      `unsigned_tx:${ctx.from.id}`,
      JSON.stringify({ tx, network }),
      "EX",
      300
    );

    await ctx.reply(
      "📝 Транзакция требует ручного подписания через MetaMask/WalletConnect:\n\n" +
      `Сеть: ${network}\n` +
      `Получатель: ${txData.recipientWallet}\n` +
      `Сумма: ${txData.amount} USDT\n` +
      `Комиссия сети: ${txData.networkFee} USDT\n` +
      `Комиссия сервиса: ${txData.serviceFee} USDT`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: "🔑 Подписать", callback_data: "sign_tx" },
            { text: "❌ Отменить", callback_data: "cancel_tx" }
          ]]
        }
      }
    );
  } catch (error) {
    logger.error(`Ошибка подготовки транзакции: ${error.message}`);
    await ctx.reply("⚠️ Ошибка при подготовке транзакции. Попробуйте позже.");
  }
}

async function handleTransaction(ctx) {
  try {
    const validation = await validateInput(ctx);

    if (!validation.success) {
      await ctx.reply(validation.message);
      return;
    }

    const { amount, username, senderId } = validation.data;

    if (ctx.from.username === username) {
      await ctx.reply("⚠️ Нельзя отправить средства самому себе");
      return;
    }

    const walletCheck = await checkWallets(ctx, senderId, username);

    if (!walletCheck) {
      await ctx.reply("⚠️ Ни у вас, ни у получателя нет ни одного активного кошелька");
      return;
    }

    const { senderWallets, recipientWallets } = walletCheck;

    const bestNetwork = await getBestNetwork();
    const provider = getProvider(bestNetwork);

    const [serviceFee, networkFee] = await Promise.all([
      calculateServiceFee(amount),
      calculateNetworkFee(bestNetwork, provider)
    ]);

    const totalAmount = amount + serviceFee + parseFloat(networkFee);

    const senderWallet = getWalletForNetwork(senderWallets, bestNetwork);
    const recipientWallet = getWalletForNetwork(recipientWallets, bestNetwork);

    if (!senderWallet || !recipientWallet) {
      await ctx.reply("⚠️ Ни у вас, ни у получателя нет ни одного активного кошелька");
      return;
    }

    // 5️⃣ Check balance
    const balance = await getWalletBalance(senderWallet, bestNetwork);

    if (balance < totalAmount) {
      await ctx.reply(
        `⚠️ Недостаточно средств.\nТребуется: ${totalAmount} USDT\nДоступно: ${balance} USDT`
      );
      return;
    }

    // 6️⃣ Show confirmation message
    const confirmMessage = getTransactionConfirmMessage(
      amount,
      username,
      bestNetwork,
      serviceFee,
      networkFee
    );

    await ctx.reply(confirmMessage.text, confirmMessage.options);

    // Save transaction data to Redis
    await redis.set(
      `pending_tx:${ctx.from.id}`,
      JSON.stringify({
        amount,
        serviceFee,
        networkFee,
        totalAmount,
        username,
        network: bestNetwork,
        recipientWallet,
        senderWallet
      }),
      "EX",
      300
    );

  } catch (error) {
    logger.error(`Ошибка в handleTransaction: ${error.message}`);
    await ctx.reply("⚠️ Ошибка при обработке транзакции. Попробуйте позже.");
  }
}

async function handleTransactionConfirmation(ctx) {
  try {
    const userId = ctx.from.id;
    const transactionData = await redis.get(`pending_tx:${userId}`);

    if (!transactionData) {
      await ctx.reply("⚠️ Данные транзакции устарели. Пожалуйста, начните новый перевод.");
      return;
    }

    const txData = JSON.parse(transactionData);

    // 7️⃣ Process based on amount
    if (txData.amount <= FEE_CONFIG.TRANSACTION.AUTO_LIMIT) {
      await executeAutoTransaction(ctx, txData);
    } else {
      await prepareManualTransaction(ctx, txData);
    }
  } catch (error) {
    logger.error(`Ошибка при подтверждении транзакции: ${error.message}`);
    await ctx.reply("⚠️ Ошибка при подтверждении транзакции. Попробуйте позже.");
  }
}

async function handleTransactionCancel(ctx) {
  try {
    await redis.del(`pending_tx:${ctx.from.id}`);
    await ctx.reply("❌ Транзакция отменена.");
  } catch (error) {
    logger.error(`Ошибка при отмене транзакции: ${error.message}`);
    await ctx.reply("⚠️ Ошибка при отмене транзакции.");
  }
}

module.exports = {
  handleTransaction,
  handleTransactionConfirmation,
  handleTransactionCancel
};