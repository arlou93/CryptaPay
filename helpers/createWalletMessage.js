function getCreateWalletMessage(type, params = {}) {
  const messages = {
    selectCreateNetwork: {
      text: "🌐 *Выберите блокчейн для кошелька*\n\n" +
        "*EVM* (Ethereum, BSC, Polygon)\n" +
        "└ _Поддержка DeFi, NFT и смарт-контрактов_\n\n" +
        "*TRON* (TRC-20)\n" +
        "└ _Быстрые и дешевые транзакции_",
      options: {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: params.buttons || [
            [{ text: "EVM", callback_data: "create_wallet_evm" }],
            [{ text: "TRON", callback_data: "create_wallet_tron" }]
          ]
        }
      }
    },

    walletAlreadyExists: {
      text: `⚠️ *У вас уже есть активный кошелек в сети ${params.network === 'evm' ? 'EVM' : 'TRON'}*\n\n` +
        `💳 *Адрес:* \`${params.address}\`\n\n` +
        `💡 Чтобы создать новый, сначала отключите текущий`,
      options: {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{
              text: `🔌 Отключить`,
              callback_data: `disconnect_wallet_${params.network || "unknown"}`
            }]
          ]
        }
      }
    },

    walletCreated: {
      text: `🏆 *Новый кошелек в сети ${params.network === 'evm' ? 'EVM' : 'TRON'} успешно создан*\n\n` +
        `💳 *Адрес:* \`${params.address}\`\n\n` +
        `🔑 *Приватный ключ:* \`${params.privateKey}\`\n\n` +
        `⚠️ *ВАЖНО:* Сохраните приватный ключ в надежном месте. Без него восстановить доступ к кошельку будет невозможно!`,
      options: {
        parse_mode: "Markdown"
      }
    }
  };

  return messages[type] || { text: "⚠️ Сообщение не найдено", options: { parse_mode: "Markdown" } };
}

module.exports = {
  getCreateWalletMessage
};
