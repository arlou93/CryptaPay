const { Telegraf } = require("telegraf");
const rateLimitMiddleware = require("./rateLimitMiddleware");

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.use(rateLimitMiddleware);

const {
  handleTransaction,
  handleTransactionConfirm,
  handleTransactionCancel
} = require("../services/transactionService");
const { getBalance } = require("../services/balanceService");
const { connectWallet, handleConnectSelection, handleWalletAddress } = require("../services/connectWalletService");
const { createWallet, handleCreateSelection } = require("../services/createWalletService");
const { disconnectWallet, handleDisconnectSelection } = require("../services/disconnectWalletService");
const { startHandler } = require("./handlers/startHandler");
const { helpHandler } = require("./handlers/helpHandler");
const { generateInvoice } = require("../services/invoiceService");
const { feesCommand } = require("./handlers/feesHandler");

bot.command("start", startHandler);

bot.command("help", helpHandler);
bot.action("help", helpHandler);

bot.command("fees", feesCommand);
bot.action("fees", feesCommand);

// bot.command("send", handleTransaction);
// bot.action('confirm_tx', handleTransactionConfirm);
// bot.action('cancel_tx', handleTransactionCancel);
bot.command("invoice", generateInvoice);
bot.command("balance", getBalance);

bot.command("create", createWallet);
bot.action("create", createWallet);
bot.action(/^create_wallet_(evm|tron)$/, handleCreateSelection);

bot.command("connect", connectWallet);
bot.action("connect", connectWallet);
bot.action(/^connect_wallet_(evm|tron)$/, handleConnectSelection);

bot.command("disconnect", disconnectWallet);
bot.action(/^disconnect_wallet_(evm|tron)$/, handleDisconnectSelection)

bot.on("message", handleWalletAddress);

module.exports = bot;