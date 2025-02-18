const { ethers } = require("ethers");
const logger = require("../../config/logger");
const FEE_CONFIG = require("../../config/feeConfig");
const { getProvider } = require("./networkService");
const { TRON_USDT_ADDRESS, USDT_ADDRESSES, USDT_ABI } = require("../../config/constants");

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


// services/transactionService/feeService.js
async function getWalletBalance(address, network) {
  try {
    const provider = getProvider(network);

    if (network === "TRON") {
      // Получаем контракт USDT в сети TRON
      const tronUsdtContract = await tronProvider.contract().at(TRON_USDT_ADDRESS);
      const balanceUsdt = await tronUsdtContract.methods.balanceOf(address).call();

      return Number(balanceUsdt) / 1e6; // USDT имеет 6 decimals
    }

    const usdtAddress = USDT_ADDRESSES[network];

    const usdtContract = new ethers.Contract(usdtAddress, USDT_ABI, provider);
    const balance = await usdtContract.balanceOf(address);
    const decimals = await usdtContract.decimals();
    return Number(ethers.formatUnits(balance, decimals));
  } catch (error) {
    logger.error(`Ошибка получения баланса USDT: ${error.message}`);
    throw new Error("Не удалось получить баланс USDT");
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