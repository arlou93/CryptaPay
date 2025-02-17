const { ethProvider, bscProvider, polygonProvider, tronProvider } = require("../../config/providers");
const logger = require("../../config/logger");

async function getGasPrice(provider) {
  try {
    const feeData = await provider.getFeeData();
    return Number(feeData.gasPrice);
  } catch (error) {
    logger.error(`Ошибка получения gasPrice: ${error.message}`);
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
    gasPrices["TRON"] = tronBlock.block_header.raw_data.number || 1000000;
  } catch (error) {
    gasPrices["TRON"] = null;
  }

  const validPrices = Object.entries(gasPrices).filter(([_, price]) => price !== null);
  if (validPrices.length === 0) return "ETH";

  return validPrices.reduce((prev, curr) => (curr[1] < prev[1] ? curr : prev))[0];
}

function getProvider(network) {
  const providers = {
    ETH: ethProvider,
    BSC: bscProvider,
    POLYGON: polygonProvider,
    TRON: tronProvider
  };
  return providers[network];
}

function getExplorerUrl(network, txHash) {
  const explorers = {
    ETH: `https://etherscan.io/tx/${txHash}`,
    BSC: `https://bscscan.com/tx/${txHash}`,
    POLYGON: `https://polygonscan.com/tx/${txHash}`,
    TRON: `https://tronscan.org/#/transaction/${txHash}`
  };
  return explorers[network];
}

module.exports = {
  getGasPrice,
  getBestNetwork,
  getProvider,
  getExplorerUrl
};