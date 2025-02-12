const { ethers } = require("ethers");

const ethProvider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);
const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
const polygonProvider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const tronProvider = new ethers.JsonRpcProvider(process.env.TRON_RPC_URL);

module.exports = { ethProvider, bscProvider, polygonProvider, tronProvider };