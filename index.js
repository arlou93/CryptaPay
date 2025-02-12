require("dotenv").config();
require("./config/db");
require("./config/redis");

const bot = require("./bot/bot");
const logger = require("./config/logger");

bot.launch().then(() => {
  logger.info("🚀 Бот запущен!");
});

console.log("🚀 Бот запущен!");

process.on("SIGINT", () => {
  logger.info("Бот остановлен (SIGINT)");
  bot.stop("SIGINT");
});

process.on("SIGTERM", () => {
  logger.info("Бот остановлен (SIGTERM)");
  bot.stop("SIGTERM");
});
