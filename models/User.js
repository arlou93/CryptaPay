const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define("User", {
  telegramId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    unique: true,
  },
  evmWalletAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  tronWalletAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  }
});

module.exports = User;