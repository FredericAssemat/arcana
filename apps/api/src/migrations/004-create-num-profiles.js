'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('num_profiles', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      grimoireId:    { type: Sequelize.UUID, allowNull: false },
      pythJson:      { type: Sequelize.TEXT, allowNull: false },
      kabJson:       { type: Sequelize.TEXT, allowNull: false },
      synthesisJson: { type: Sequelize.TEXT, allowNull: false },
      createdAt:     { type: Sequelize.DATE, allowNull: false },
      updatedAt:     { type: Sequelize.DATE, allowNull: false },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable('num_profiles'); },
};
