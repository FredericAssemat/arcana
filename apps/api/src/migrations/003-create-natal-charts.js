'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('natal_charts', {
      id:          { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      grimoireId:  { type: Sequelize.UUID, allowNull: false },
      planetsJson: { type: Sequelize.TEXT('long'), allowNull: false },
      ascendant:   { type: Sequelize.STRING, allowNull: true },
      midheaven:   { type: Sequelize.STRING, allowNull: true },
      housesJson:  { type: Sequelize.TEXT, allowNull: true },
      julianDay:   { type: Sequelize.DOUBLE, allowNull: false },
      houseSystem: { type: Sequelize.STRING, defaultValue: 'equal' },
      timeKnown:   { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt:   { type: Sequelize.DATE, allowNull: false },
      updatedAt:   { type: Sequelize.DATE, allowNull: false },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable('natal_charts'); },
};
