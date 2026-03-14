'use strict';
const { sequelize, Sequelize } = require('./index');
const ShareToken = sequelize.define('ShareToken', {
  id:              { type: Sequelize.DataTypes.UUID, defaultValue: Sequelize.DataTypes.UUIDV4, primaryKey: true },
  senderId:        { type: Sequelize.DataTypes.UUID, allowNull: false },
  grimoireId:      { type: Sequelize.DataTypes.UUID, allowNull: false },
  token:           { type: Sequelize.DataTypes.UUID, defaultValue: Sequelize.DataTypes.UUIDV4, unique: true },
  recipientEmail:  { type: Sequelize.DataTypes.STRING, allowNull: true },
  expiresAt:       { type: Sequelize.DataTypes.DATE, allowNull: false },
  claimedAt:       { type: Sequelize.DataTypes.DATE, allowNull: true },
}, { tableName: 'share_tokens', timestamps: true });
module.exports = ShareToken;
