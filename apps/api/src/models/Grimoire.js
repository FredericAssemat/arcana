'use strict';

const { sequelize, Sequelize } = require('./index');

const Grimoire = sequelize.define('Grimoire', {
  id: {
    type:         Sequelize.DataTypes.UUID,
    defaultValue: Sequelize.DataTypes.UUIDV4,
    primaryKey:   true,
  },
  userId: {
    type:      Sequelize.DataTypes.UUID,
    allowNull: false,
  },
  firstName: {
    type:      Sequelize.DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type:      Sequelize.DataTypes.STRING,
    allowNull: false,
  },
  birthDate: {
    type:      Sequelize.DataTypes.DATEONLY,
    allowNull: false,
  },
  birthTime: {
    type:      Sequelize.DataTypes.STRING,
    allowNull: true,
  },
  birthCity: {
    type:      Sequelize.DataTypes.STRING,
    allowNull: false,
  },
  birthLat: {
    type:      Sequelize.DataTypes.FLOAT,
    allowNull: true,
  },
  birthLon: {
    type:      Sequelize.DataTypes.FLOAT,
    allowNull: true,
  },
  timezone: {
    type:         Sequelize.DataTypes.STRING,
    allowNull:    false,
    defaultValue: 'Europe/Paris',
  },
  isOwn: {
    type:         Sequelize.DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName:  'grimoires',
  timestamps: true,
});

module.exports = Grimoire;
