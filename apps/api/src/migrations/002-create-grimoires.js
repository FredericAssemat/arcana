'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('grimoires', {
      id:        { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId:    { type: Sequelize.UUID, allowNull: false },
      firstName: { type: Sequelize.STRING, allowNull: false },
      lastName:  { type: Sequelize.STRING, allowNull: false },
      birthDate: { type: Sequelize.DATEONLY, allowNull: false },
      birthTime: { type: Sequelize.STRING, allowNull: true },
      birthCity: { type: Sequelize.STRING, allowNull: false },
      birthLat:  { type: Sequelize.FLOAT, allowNull: true },
      birthLon:  { type: Sequelize.FLOAT, allowNull: true },
      timezone:  { type: Sequelize.STRING, allowNull: false, defaultValue: 'Europe/Paris' },
      isOwn:     { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('grimoires');
  },
};
