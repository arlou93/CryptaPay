const { Telegraf } = require("telegraf");
const rateLimitMiddleware = require("./rateLimitMiddleware");

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.use(rateLimitMiddleware);

const { handleSignedTransaction, handleTransaction } = require("../services/transactionService");
const { getBalance } = require("../services/balanceService");
const { connectWallet, catchWalletAddress } = require("../services/connectWalletService");
const { createWallet } = require("../services/createWalletService");
const { disconnectWallet } = require("../services/disconnectWalletService");
const { startHandler } = require("./handlers/startHandler");

bot.command("start", startHandler);
bot.command("send", handleTransaction);
bot.command("balance", getBalance);
bot.command("create", createWallet);
bot.command("connect", connectWallet);
bot.command("disconnect", disconnectWallet);
bot.on("message", catchWalletAddress);
bot.on("message", handleSignedTransaction);

module.exports = bot;