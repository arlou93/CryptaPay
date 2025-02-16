const { redis } = require("../config/redis");
const User = require("../models/User.model");
const { ethers } = require("ethers");
const { TronWeb } = require("tronweb");
const { getConnectWalletMessage } = require("../helpers/connectWalletMessages");

async function connectWallet(ctx) {
  const message = getConnectWalletMessage('selectNetwork');
  await ctx.reply(message.text, message.options);
}

async function handleConnectSelection(ctx) {
  const chatId = Number(ctx.from.id);
  const network = ctx.match[1];

  let cachedWallet = await redis.get(`wallet:${chatId}`);
  let cachedTronWallet = await redis.get(`tronWallet:${chatId}`);

  if (network === "evm" && cachedWallet) {
    const message = getConnectWalletMessage('walletExists', { network, address: cachedWallet });
    await ctx.reply(message.text, message.options);
    return;
  }

  if (network === "tron" && cachedTronWallet) {
    const message = getConnectWalletMessage('walletExists', { network, address: cachedTronWallet });
    await ctx.reply(message.text, message.options);
    return;
  }

  const message = getConnectWalletMessage('enterAddress', { network });

  await ctx.reply(message.text, message.options);
  await redis.set(`wallet_setup:${chatId}`, network, 'EX', 300);
}

async function handleWalletAddress(ctx, next) {
  const chatId = Number(ctx.from.id);
  const network = await redis.get(`wallet_setup:${chatId}`);

  if (!network) {
    return next();
  }

  const address = ctx.message.text.trim();

  if (network === "evm" && !ethers.isAddress(address)) {
    const message = getConnectWalletMessage('invalidAddress', { network });
    await ctx.reply(message.text, message.options);
    return;
  }

  if (network === "tron" && !TronWeb.isAddress(address)) {
    const message = getConnectWalletMessage('invalidAddress', { network });
    await ctx.reply(message.text, message.options);
    return;
  }

  let user = await User.findOne({ where: { telegramId: chatId } });

  if (user) {
    const updateData = network === "evm"
      ? { walletAddress: address }
      : { tronWalletAddress: address };

    await User.update(updateData, {
      where: { telegramId: chatId }
    });
  } else {
    await User.create({
      telegramId: chatId,
      username: ctx.from.username || null,
      walletAddress: network === "evm" ? address : null,
      tronWalletAddress: network === "tron" ? address : null
    });
  }

  // Кешируем кошелек
  await redis.set(
    network === "evm" ? `wallet:${chatId}` : `tronWallet:${chatId}`,
    address,
    'EX',
    3600
  );

  const message = getConnectWalletMessage('walletConnected', { network, address });
  await ctx.reply(message.text, message.options);
  await redis.del(`wallet_setup:${chatId}`);
}

module.exports = {
  connectWallet,
  handleConnectSelection,
  handleWalletAddress,
};