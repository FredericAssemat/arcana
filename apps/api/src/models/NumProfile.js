'use strict';
const { sequelize, Sequelize } = require('./index');
const NumProfile = sequelize.define('NumProfile', {
  id:              { type: Sequelize.DataTypes.UUID, defaultValue: Sequelize.DataTypes.UUIDV4, primaryKey: true },
  grimoireId:      { type: Sequelize.DataTypes.UUID, allowNull: false },
  pythJson:        { type: Sequelize.DataTypes.TEXT, allowNull: false },
  kabJson:         { type: Sequelize.DataTypes.TEXT, allowNull: false },
  synthesisJson:   { type: Sequelize.DataTypes.TEXT, allowNull: false },
}, { tableName: 'num_profiles', timestamps: true });
module.exports = NumProfile;
