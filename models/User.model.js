const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define("User", {
  telegramId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    unique: true,
  },
  walletAddress: {
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
