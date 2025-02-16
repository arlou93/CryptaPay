function getConnectWalletMessage(type, params = {}) {
  const network = params.network ? params.network : "UNKNOWN";
  const address = params.address || "N/A";

  const messages = {
    selectNetwork: {
      text: "🌐 *К какой сети подключен ваш кошелек?*",
      options: {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "EVM (Ethereum, BSC, Polygon)", callback_data: "connect_wallet_evm" }],
            [{ text: "TRON (TRC-20)", callback_data: "connect_wallet_tron" }]
          ]
        }
      }
    },

    walletExists: {
      text: `⚠️ *У вас уже есть активный кошелек в сети ${network === 'evm' ? 'EVM' : 'TRON'}*\n\n` +
        `💳 *Адрес:* \`${address}\`\n\n` +
        `💡 Чтобы подключить новый, сначала отключите текущий`,
      options: {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{
              text: `🔌 Отключить`,
              callback_data: `disconnect_wallet_${network || "unknown"}`
            }]
          ]
        }
      }
    },

    enterAddress: {
      text: `✍️ Пожалуйста, отправьте адрес вашего *${network === 'evm' ? 'EVM' : 'TRON'}*-кошелька для привязки`,
      options: {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: params.buttons || []
        }
      }
    },

    invalidAddress: {
      text: `⚠️ *Неверный адрес*\n\n Убедитесь, что это ${network === "evm" ? "EVM-адрес (начинается с 0x)" : "TRON-адрес (начинается с T)"}`,
      options: {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: params.buttons || []
        }
      }
    },

    walletConnected: {
      text: `🏆 Ваш *${network}* кошелек успешно подключен`,
      options: { parse_mode: "Markdown" }
    },
  };

  return messages[type] || { text: "Message not found", options: { parse_mode: "Markdown" } };
}

module.exports = {
  getConnectWalletMessage
};
