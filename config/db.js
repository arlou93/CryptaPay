const { Sequelize } = require("sequelize");
const dotenv = require("dotenv");
const { info, error } = require("./logger");

dotenv.config();

const sequelize = new Sequelize(process.env.DB_URI, {
  dialect: "postgres",
  dialectOptions: {
    ssl: process.env.DB_SSL === "true" ? { require: true, rejectUnauthorized: false } : false,
  },
});

sequelize.authenticate()
  .then(() => {
    info("✅ База данных подключена");
    return sequelize.sync({ alter: true });
  })
  .then(() => {
    info("✅ Таблицы синхронизированы");
  })
  .catch(err => error("❌ Ошибка подключения к БД:", err));

module.exports = sequelize;
