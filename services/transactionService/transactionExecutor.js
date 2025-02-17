const { ethers } = require("ethers");
const logger = require("../../config/logger");
const { getProvider } = require("./networkService");
const FEE_CONFIG = require("../../config/feeConfig");

async function createEvmTransaction(txData, provider) {
  const nonce = await provider.getTransactionCount(txData.senderWallet);
  const networkConfig = FEE_CONFIG.NETWORK[txData.network];

  const gasLimit = networkConfig.BASE_GAS;

  return {
    from: txData.senderWallet,
    to: txData.recipientWallet,
    value: ethers.parseUnits(txData.amount.toString(), "ether"),
    nonce: nonce,
    gasPrice: await provider.getGasPrice(),
    gasLimit: gasLimit
  };
}

async function createTronTransaction(txData, provider) {
  return await provider.transactionBuilder.sendTrx(
    txData.recipientWallet,
    txData.amount * 1_000_000, // Convert to SUN
    txData.senderWallet
  );
}

async function executeTransaction(txData) {
  try {
    if (txData.network === "TRON") {
      return await executeTronTransaction(txData);
    }
    return await executeEvmTransaction(txData);
  } catch (error) {
    logger.error(`Ошибка выполнения транзакции: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function executeEvmTransaction(txData) {
  const provider = getProvider(txData.network);
  try {
    const tx = await createEvmTransaction(txData, provider);
    const response = await provider.sendTransaction(tx);
    const receipt = await response.wait();

    return {
      success: true,
      txHash: receipt.transactionHash,
      network: txData.network
    };
  } catch (error) {
    logger.error(`Ошибка EVM транзакции: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function executeTronTransaction(txData) {
  const provider = getProvider("TRON");
  try {
    const tx = await createTronTransaction(txData, provider);
    const signedTx = await provider.trx.sign(tx);
    const receipt = await provider.trx.sendRawTransaction(signedTx);

    return {
      success: true,
      txHash: receipt.txid,
      network: "TRON"
    };
  } catch (error) {
    logger.error(`Ошибка TRON транзакции: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function prepareUnsignedTransaction(txData) {
  const provider = getProvider(txData.network);
  const unsignedTx = txData.network === "TRON"
    ? await createTronTransaction(txData, provider)
    : await createEvmTransaction(txData, provider);

  return {
    tx: unsignedTx,
    network: txData.network
  };
}

module.exports = {
  executeTransaction,
  prepareUnsignedTransaction
};