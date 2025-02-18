const { redis } = require("../config/redis");

const RATE_LIMITS = {
  "/send": 1, // Переводы раз в 10 сек
  "/balance": 1, // Запрос баланса раз в 5 сек
  "/connect": 1, // Подключение кошелька раз в 30 сек
  "/create": 1, // Создание кошелька раз в 60 сек
};

async function rateLimitMiddleware(ctx, next) {
  if (!ctx.from || !ctx.message || !ctx.message.text) {
    return next();
  }

  const userId = ctx.from.id;
  const command = ctx.message.text.split(" ")[0];
  const limit = RATE_LIMITS[command] || 5;
  const redisKey = `ratelimit:${userId}:${command}`;

  const lastRequest = await redis.get(redisKey);

  if (lastRequest) {
    const timePassed = Math.floor(Date.now() / 1000) - lastRequest;
    if (timePassed < limit) {
      return ctx.reply(`⏳ Подождите ${limit - timePassed} сек перед повторным использованием команды.`);
    }
  }

  await redis.set(redisKey, Math.floor(Date.now() / 1000), "EX", limit);
  return next();
}

module.exports = rateLimitMiddleware;
