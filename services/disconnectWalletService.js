const User = require("../models/User.model");
const { redis } = require("../config/redis");
const { getDisconnectWalletMessage } = require("../helpers/getDisconnectWalletMessage");

async function disconnectWallet(ctx) {
  const chatId = Number(ctx.from.id);

  let cachedWallet = await redis.get(`wallet:${chatId}`);
  let cachedTronWallet = await redis.get(`tronWallet:${chatId}`);

  const user = await User.findOne({ where: { telegramId: chatId } });

  if (!cachedWallet && !cachedTronWallet && (!user?.walletAddress && !user?.tronWalletAddress)) {
    const message = getDisconnectWalletMessage('noWallets')
    await ctx.reply(message.text, message.options);
    return;
  }

  const buttons = [];
  if (cachedWallet || user?.walletAddress) {
    buttons.push([{
      text: "EVM",
      callback_data: "disconnect_wallet_evm"
    }]);
  }

  if (cachedTronWallet || user?.tronWalletAddress) {
    buttons.push([{
      text: "TRON",
      callback_data: "disconnect_wallet_tron"
    }]);
  }

  const message = getDisconnectWalletMessage('selectWalletToDisconnect', {
    buttons,
    tronWalletAddress: user?.tronWalletAddress,
    walletAddress: user?.walletAddress,
  });
  await ctx.reply(message.text, message.options);
}

async function handleDisconnectSelection(ctx) {
  const chatId = Number(ctx.from.id);
  const network = ctx.match[1];
  const user = await User.findOne({ where: { telegramId: chatId } });

  if (!user) {
    const message = getDisconnectWalletMessage('userNotFound');
    await ctx.reply(message.text, message.options);
    return;
  }

  let cachedWallet = await redis.get(`wallet:${chatId}`);
  let cachedTronWallet = await redis.get(`tronWallet:${chatId}`);

  if (network === 'evm' && cachedWallet || network === 'evm' && user?.walletAddress) {
    await User.update(
      { walletAddress: null },
      { where: { telegramId: chatId } }
    );

    await redis.del(`wallet:${chatId}`);

    const message = getDisconnectWalletMessage('walletDisconnectedEVM');
    await ctx.reply(message.text, message.options);
  }

  if (network === 'tron' && cachedTronWallet || network === 'tron' && user?.tronWalletAddress) {
    await User.update(
      { tronWalletAddress: null },
      { where: { telegramId: chatId } }
    );

    await redis.del(`tronWallet:${chatId}`);

    const message = getDisconnectWalletMessage('walletDisconnectedTRON');
    await ctx.reply(message.text, message.options);
  }

  await ctx.answerCbQuery();
}

module.exports = { disconnectWallet, handleDisconnectSelection };
