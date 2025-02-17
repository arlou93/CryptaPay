const User = require("../models/User");
const { redis } = require("../config/redis");
const { getDisconnectWalletMessage } = require("../helpers/getDisconnectWalletMessage");

async function disconnectWallet(ctx) {
  const chatId = Number(ctx.from.id);

  let cachedEvmWallet = await redis.get(`evmWallet:${chatId}`);
  let cachedTronWallet = await redis.get(`tronWallet:${chatId}`);

  const user = await User.findOne({ where: { telegramId: chatId } });

  if (!cachedEvmWallet && !cachedTronWallet && (!user?.evmWalletAddress && !user?.tronWalletAddress)) {
    const message = getDisconnectWalletMessage('noWallets')
    await ctx.reply(message.text, message.options);
    return;
  }

  const buttons = [];
  if (cachedEvmWallet || user?.evmWalletAddress) {
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
    evmWalletAddress: user?.evmWalletAddress,
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

  let cachedEvmWallet = await redis.get(`evmWallet:${chatId}`);
  let cachedTronWallet = await redis.get(`tronWallet:${chatId}`);

  if (network === 'evm' && (cachedEvmWallet || user?.evmWalletAddress)) {
    // Обновляем базу данных
    await User.update(
      { evmWalletAddress: null },
      { where: { telegramId: chatId } }
    );

    // Удаляем кэш по chatId
    await redis.del(`evmWallet:${chatId}`);

    const message = getDisconnectWalletMessage('walletDisconnectedEVM');
    await ctx.reply(message.text, message.options);
  }

  if (network === 'tron' && (cachedTronWallet || user?.tronWalletAddress)) {
    // Обновляем базу данных
    await User.update(
      { tronWalletAddress: null },
      { where: { telegramId: chatId } }
    );

    // Удаляем кэш по chatId
    await redis.del(`tronWallet:${chatId}`);

    const message = getDisconnectWalletMessage('walletDisconnectedTRON');
    await ctx.reply(message.text, message.options);
  }

  await ctx.answerCbQuery();
}

module.exports = { disconnectWallet, handleDisconnectSelection };
