const USDT_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

const USDT_ADDRESSES = {
  ETH: "0xdAC17F958D2ee523a2206206994597C13D831ec7",    // Ethereum Mainnet
  BSC: "0x55d398326f99059fF775485246999027B3197955",    // BSC Mainnet
  POLYGON: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" // Polygon Mainnet
};

const TRON_USDT_ADDRESS = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";


module.exports = {
  USDT_ABI,
  USDT_ADDRESSES,
  TRON_USDT_ADDRESS
}