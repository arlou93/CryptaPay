const { redis } = require("../config/redis");
const User = require("../models/User.model");
const { ethers } = require("ethers");
const { TronWeb } = require("tronweb");
const { getConnectWalletMessage } = require("../helpers/connectWalletMessages");

// Константы
const CACHE_EXPIRATION = 3600; // 1 час
const SETUP_EXPIRATION = 300;  // 5 минут для setup

async function connectWallet(ctx) {
  const message = getConnectWalletMessage('selectNetwork');
  await ctx.reply(message.text, message.options);
}

async function handleConnectSelection(ctx) {
  const chatId = Number(ctx.from.id);
  const network = ctx.match && ctx.match[1];

  if (!network || !["evm", "tron"].includes(network)) {
    await ctx.reply("⚠️ Не удалось определить сеть. Пожалуйста, попробуйте еще раз.");
    return;
  }
  // Проверяем кэш по обоим идентификаторам
  const [cachedEvmWallet, cachedTronWallet] = await Promise.all([
    redis.get(`evmWallet:${chatId}`),
    redis.get(`tronWallet:${chatId}`)
  ]);

  // Если кошелек уже существует, показываем сообщение
  if (network === "evm" && cachedEvmWallet) {
    const message = getConnectWalletMessage('walletExists', { network, address: cachedEvmWallet });
    await ctx.reply(message.text, message.options);
    return;
  }

  if (network === "tron" && cachedTronWallet) {
    const message = getConnectWalletMessage('walletExists', { network, address: cachedTronWallet });
    await ctx.reply(message.text, message.options);
    return;
  }

  // Сохраняем выбранную сеть во временном кэше
  const message = getConnectWalletMessage('enterAddress', { network });
  await ctx.reply(message.text, message.options);
  await redis.set(`wallet_setup:${chatId}`, network, 'EX', SETUP_EXPIRATION);
}

async function handleWalletAddress(ctx, next) {
  const chatId = Number(ctx.from.id);
  const username = ctx.from.username;
  const network = await redis.get(`wallet_setup:${chatId}`);

  if (!network) {
    return next();
  }

  const address = ctx.message.text.trim();

  // Валидация адреса
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

  try {
    // Обновляем или создаем пользователя
    let user = await User.findOne({ where: { telegramId: chatId } });

    if (user) {
      const updateData = network === "evm"
        ? { evmWalletAddress: address }
        : { tronWalletAddress: address };

      await User.update(updateData, {
        where: { telegramId: chatId }
      });
    } else {
       await User.create({
        telegramId: chatId,
        username: username || null,
        evmWalletAddress: network === "evm" ? address : null,
        tronWalletAddress: network === "tron" ? address : null
      });
    }

    const cachePromises = [];

    cachePromises.push(
      redis.set(
        network === "evm" ? `evmWallet:${chatId}` : `tronWallet:${chatId}`,
        address,
        'EX',
        CACHE_EXPIRATION
      )
    );

    if (username) {
      cachePromises.push(
        redis.set(
          network === "evm" ? `evmWallet:${username}` : `tronWallet:${username}`,
          address,
          'EX',
          CACHE_EXPIRATION
        )
      );
    }

    // Удаляем временный кэш setup
    cachePromises.push(redis.del(`wallet_setup:${chatId}`));

    await Promise.all(cachePromises);

    const message = getConnectWalletMessage('walletConnected', { network, address });
    await ctx.reply(message.text, message.options);

  } catch (error) {
    const message = getConnectWalletMessage('error');
    await ctx.reply(message.text, message.options);
    await redis.del(`wallet_setup:${chatId}`);
  }
}

module.exports = {
  connectWallet,
  handleConnectSelection,
  handleWalletAddress,
};