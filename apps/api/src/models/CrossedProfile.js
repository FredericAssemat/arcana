'use strict';
const { sequelize, Sequelize } = require('./index');
const CrossedProfile = sequelize.define('CrossedProfile', {
  id:                  { type: Sequelize.DataTypes.UUID, defaultValue: Sequelize.DataTypes.UUIDV4, primaryKey: true },
  grimoireId:          { type: Sequelize.DataTypes.UUID, allowNull: false },
  archetypeAxesJson:   { type: Sequelize.DataTypes.TEXT, allowNull: false },
  convergencesJson:    { type: Sequelize.DataTypes.TEXT, allowNull: false },
  tensionsJson:        { type: Sequelize.DataTypes.TEXT, allowNull: false },
  dominantsJson:       { type: Sequelize.DataTypes.TEXT, allowNull: false },
  lacksJson:           { type: Sequelize.DataTypes.TEXT, allowNull: false },
  stonesJson:          { type: Sequelize.DataTypes.TEXT, allowNull: false },
}, { tableName: 'crossed_profiles', timestamps: true });
module.exports = CrossedProfile;
