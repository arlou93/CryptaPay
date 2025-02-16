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
    unique: false,
  },
  tronWalletAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: false,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  }
});

module.exports = User;
