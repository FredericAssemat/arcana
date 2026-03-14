'use strict';
const { sequelize, Sequelize } = require('./index');
const NatalChart = sequelize.define('NatalChart', {
  id:          { type: Sequelize.DataTypes.UUID, defaultValue: Sequelize.DataTypes.UUIDV4, primaryKey: true },
  grimoireId:  { type: Sequelize.DataTypes.UUID, allowNull: false },
  planetsJson: { type: Sequelize.DataTypes.TEXT('long'), allowNull: false },
  ascendant:   { type: Sequelize.DataTypes.STRING, allowNull: true },
  midheaven:   { type: Sequelize.DataTypes.STRING, allowNull: true },
  housesJson:  { type: Sequelize.DataTypes.TEXT, allowNull: true },
  julianDay:   { type: Sequelize.DataTypes.DOUBLE, allowNull: false },
  houseSystem: { type: Sequelize.DataTypes.STRING, defaultValue: 'equal' },
  timeKnown:   { type: Sequelize.DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'natal_charts', timestamps: true });
module.exports = NatalChart;
