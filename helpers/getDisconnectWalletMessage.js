function getDisconnectWalletMessage(type, params = {}) {
  const messages = {
    noWallets: {
      text: "⚠️ *У вас нет активных кошельков*",
      options: {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Подключить", callback_data: "connect" }],
            [{ text: "Создать", callback_data: "create" }]
          ]
        }
      }
    },

    selectWalletToDisconnect: {
      text: "🔌 *Выберите кошелек для отключения*\n\n" +
        `${params.evmWalletAddress ? "*EVM:*" : ""} \`${params.evmWalletAddress || ""}\`\n\n` +
        `${params.tronWalletAddress ? "*TRON:*" : ""} \`${params.tronWalletAddress || ""}\``,
      options: {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: params.buttons || []
        }
      }
    },

    walletDisconnectedEVM: {
      text: "✅ *EVM кошелек успешно отключен*\n\n" +
        "💡 Вы можете подключить либо создать новый EVM-кошелек",
      options: {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Подключить", callback_data: "connect_wallet_evm" }],
            [{ text: "Создать", callback_data: "create_wallet_evm" }],
          ]
        }
      }
    },

    walletDisconnectedTRON: {
      text: "✅ *TRON кошелек успешно отключен*\n\n" +
        "💡 Вы можете подключить либо создать новый TRON-кошелек",
      options: {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Подключить", callback_data: "connect_wallet_tron" }],
            [{ text: "Создать", callback_data: "create_wallet_tron" }],
          ]
        }
      }
    },

    userNotFound: {
      text: "⚠️ Пользователь не найден",
      options: {
        parse_mode: "Markdown"
      }
    }
  };

  return messages[type] || { text: "⚠️ Сообщение не найдено", options: { parse_mode: "Markdown" } };
}

module.exports = {
  getDisconnectWalletMessage
};
