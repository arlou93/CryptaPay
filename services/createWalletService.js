const { redis } = require("../config/redis");
const User = require("../models/User.model");
const { Wallet } = require("ethers");
const { TronWeb } = require("tronweb");
const { getCreateWalletMessage } = require("../helpers/createWalletMessage");

async function createWallet(ctx) {
  const message = getCreateWalletMessage('selectCreateNetwork');
  await ctx.reply(message.text, message.options);
}

async function handleCreateSelection(ctx) {
  const chatId = Number(ctx.from.id);
  const network = ctx.match[1];

  let cachedWallet = await redis.get(`wallet:${chatId}`);
  let cachedTronWallet = await redis.get(`tronWallet:${chatId}`);

  if (network === "evm" && cachedWallet || network === "tron" && cachedTronWallet) {
    const message = getCreateWalletMessage('walletAlreadyExists', {
      network,
      address: network === "evm" ? cachedWallet : cachedTronWallet
    });
    await ctx.reply(message.text, message.options);
    return;
  }

  let user = await User.findOne({ where: { telegramId: chatId } });

  if (network === "evm" && user?.walletAddress) {
    await redis.set(`wallet:${chatId}`, user.walletAddress, 'EX', 3600);
    const message = getCreateWalletMessage('walletAlreadyExists', { network, address: user.walletAddress });
    await ctx.reply(message.text, message.options);
    return;
  }

  if (network === "tron" && user?.tronWalletAddress) {
    await redis.set(`tronWallet:${chatId}`, user.tronWalletAddress, 'EX', 3600);
    const message = getCreateWalletMessage('walletAlreadyExists', { network, address: user.tronWalletAddress });
    await ctx.reply(message.text, message.options);
    return;
  }

  let newWallet;
  if (network === "evm") {
    newWallet = Wallet.createRandom();
  } else {
    newWallet = await TronWeb.createAccount();
  }

  if (user) {
    const updateData = network === "evm"
      ? { walletAddress: newWallet.address }
      : { tronWalletAddress: newWallet.address.base58 };

    await User.update(updateData, {
      where: { telegramId: chatId }
    });
  } else {
    await User.create({
      telegramId: chatId,
      username: ctx.from.username || null,
      walletAddress: network === "evm" ? newWallet.address : null,
      tronWalletAddress: network === "tron" ? newWallet.address.base58 : null
    });
  }

  if (network === "evm") {
    await redis.set(`wallet:${chatId}`, newWallet.address, 'EX', 3600);
    await redis.del(`wallet_setup:${chatId}`);

    const message = getCreateWalletMessage('walletCreated', {
      network,
      address: newWallet.address,
      privateKey: newWallet.privateKey
    });
    await ctx.reply(message.text, message.options);
  } else {
    await redis.set(`tronWallet:${chatId}`, newWallet.address.base58, 'EX', 3600);
    await redis.del(`wallet_setup:${chatId}`);
    
    const message = getCreateWalletMessage('walletCreated', {
      network,
      address: newWallet.address.base58,
      privateKey: newWallet.privateKey
    });
    await ctx.reply(message.text, message.options);
  }
}

module.exports = { createWallet, handleCreateSelection };
