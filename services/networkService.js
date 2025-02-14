const { ethProvider, bscProvider, polygonProvider, tronProvider } = require("../config/providers");

async function getGasPrice(provider) {
  try {
    const feeData = await provider.getFeeData();
    return feeData.gasPrice;
  } catch (error) {
    console.error("Ошибка получения gasPrice:", error.message);
    return null;
  }
}

async function getBestNetwork() {
  const gasPrices = {};

  gasPrices["ETH"] = await getGasPrice(ethProvider);
  gasPrices["BSC"] = await getGasPrice(bscProvider);
  gasPrices["POLYGON"] = await getGasPrice(polygonProvider);

  try {
    const tronBlock = await tronProvider.trx.getCurrentBlock();
    gasPrices["TRON"] = tronBlock.block_header.raw_data.number || 1000000; // Эмуляция
  } catch (error) {
    gasPrices["TRON"] = null;
  }

  const validPrices = Object.entries(gasPrices).filter(([_, price]) => price !== null);

  if (validPrices.length === 0) return "ETH";

  return validPrices.reduce((prev, curr) => (curr[1] < prev[1] ? curr : prev))[0];
}

module.exports = { getBestNetwork };
