const { ethers } = require("ethers");
const { ethProvider, bscProvider, polygonProvider, tronProvider } = require("../../config/providers");
const logger = require("../../config/logger");
const FEE_CONFIG = require("../../config/feeConfig");

function calculateServiceFee(amount) {
  const fee = amount * FEE_CONFIG.SERVICE.PERCENTAGE;
  return Math.min(Math.max(fee, FEE_CONFIG.SERVICE.MIN_FEE), FEE_CONFIG.SERVICE.MAX_FEE);
}

async function calculateNetworkFee(network, provider) {
  try {
    if (network === "TRON") {
      return FEE_CONFIG.NETWORK.TRON.ENERGY_FEE / 1_000_000; // в TRX
    }

    const feeData = await provider.getFeeData();
    const networkConfig = FEE_CONFIG.NETWORK[network];

    // Защита от `null` в baseFee
    const baseFee = feeData.gasPrice || feeData.maxFeePerGas;
    const priorityFee = ethers.parseUnits(networkConfig.PRIORITY_FEE.toString(), 'gwei');

    // Корректное сложение BigInt
    const totalFeeWei = (baseFee + priorityFee) * BigInt(networkConfig.BASE_GAS);

    return ethers.formatEther(totalFeeWei);
  } catch (error) {
    logger.error(`Ошибка расчета комиссии сети ${network}: ${error.message}`);
    throw new Error(`Не удалось рассчитать комиссию сети ${network}`);
  }
}


async function getWalletBalance(address, network) {
  try {
    if (network === "TRON") {
      const balance = await tronProvider.trx.getBalance(address);
      return tronProvider.fromSun(balance);
    }

    const provider = { ETH: ethProvider, BSC: bscProvider, POLYGON: polygonProvider }[network];
    const balanceWei = await provider.getBalance(address);
    return parseFloat(ethers.formatEther(balanceWei));
  } catch (error) {
    logger.error(`Ошибка получения баланса: ${error.message}`);
    throw new Error("Не удалось получить баланс");
  }
}

function getTransactionConfirmMessage(amount, username, network, serviceFee, networkFee) {
  const totalFee = parseFloat(serviceFee) + parseFloat(networkFee);
  const totalAmount = amount + totalFee;

  return {
    text: `📝 *Подтвердите перевод:*\n\n` +
      `📤 Сумма перевода: *${amount} USDT*\n` +
      `👤 Получатель: *@${username}*\n` +
      `🌐 Сеть: *${network}*\n\n` +
      `*Комиссии:*\n` +
      `📊 Комиссия сервиса (0.5%): *${serviceFee} USDT*\n` +
      `⛽️ Комиссия сети: *${networkFee} USDT*\n` +
      `💰 Общая комиссия: *${totalFee.toFixed(4)} USDT*\n\n` +
      `📈 Итого к списанию: *${totalAmount.toFixed(4)} USDT*`,
    options: {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Подтвердить", callback_data: `confirm_tx` },
            { text: "❌ Отменить", callback_data: `cancel_tx` }
          ]
        ]
      }
    }
  };
}

module.exports = {
  calculateServiceFee,
  calculateNetworkFee,
  getWalletBalance,
  getTransactionConfirmMessage
};