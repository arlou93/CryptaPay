const FEE_CONFIG = {
  SERVICE: {
    PERCENTAGE: 0.005, // 0.5%
    MIN_FEE: 1, // Минимум 1 USDT
    MAX_FEE: 100 // Максимум 100 USDT
  },
  NETWORK: {
    ETH: {
      BASE_GAS: 21000,
      PRIORITY_FEE: 2 // gwei
    },
    BSC: {
      BASE_GAS: 21000,
      PRIORITY_FEE: 1.1 // gwei
    },
    POLYGON: {
      BASE_GAS: 21000,
      PRIORITY_FEE: 10 // gwei
    },
    TRON: {
      ENERGY_FEE: 280 // sun
    }
  },
  TRANSACTION: {
    AUTO_LIMIT: 100, // Лимит для автоматических транзакций
    CONFIRMATION_TIMEOUT: 300 // 5 минут на подтверждение
  }
};

module.exports = FEE_CONFIG;