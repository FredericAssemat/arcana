'use strict';
const { sequelize, Sequelize } = require('./index');
const Narrative = sequelize.define('Narrative', {
  id:          { type: Sequelize.DataTypes.UUID, defaultValue: Sequelize.DataTypes.UUIDV4, primaryKey: true },
  grimoireId:  { type: Sequelize.DataTypes.UUID, allowNull: false },
  text:        { type: Sequelize.DataTypes.TEXT('long'), allowNull: false },
  model:       { type: Sequelize.DataTypes.STRING, defaultValue: 'claude-sonnet-4-5' },
  tokensUsed:  { type: Sequelize.DataTypes.INTEGER, allowNull: true },
}, { tableName: 'narratives', timestamps: true });
module.exports = Narrative;
