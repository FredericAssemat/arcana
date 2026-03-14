'use strict';

const { sequelize, Sequelize } = require('./index');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type:          Sequelize.DataTypes.UUID,
    defaultValue:  Sequelize.DataTypes.UUIDV4,
    primaryKey:    true,
  },
  email: {
    type:      Sequelize.DataTypes.STRING,
    allowNull: false,
    unique:    true,
    validate:  { isEmail: true },
  },
  passwordHash: {
    type:      Sequelize.DataTypes.STRING,
    allowNull: false,
  },
  firstName: {
    type:      Sequelize.DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName:  'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.passwordHash) {
        user.passwordHash = await bcrypt.hash(user.passwordHash, 12);
      }
    },
  },
});

User.prototype.validatePassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = User;
