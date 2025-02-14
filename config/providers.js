const { ethers } = require("ethers");
const { TronWeb } = require("tronweb");

const ethProvider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);
const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
const polygonProvider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const tronProvider = new TronWeb({
  fullHost: process.env.TRON_RPC_URL,
  privateKey: process.env.PRIVATE_KEY,
});

module.exports = { ethProvider, bscProvider, polygonProvider, tronProvider };
