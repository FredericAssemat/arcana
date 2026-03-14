'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('crossed_profiles', {
      id:                  { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      grimoireId:          { type: Sequelize.UUID, allowNull: false },
      archetypeAxesJson:   { type: Sequelize.TEXT, allowNull: false },
      convergencesJson:    { type: Sequelize.TEXT, allowNull: false },
      tensionsJson:        { type: Sequelize.TEXT, allowNull: false },
      dominantsJson:       { type: Sequelize.TEXT, allowNull: false },
      lacksJson:           { type: Sequelize.TEXT, allowNull: false },
      stonesJson:          { type: Sequelize.TEXT, allowNull: false },
      createdAt:           { type: Sequelize.DATE, allowNull: false },
      updatedAt:           { type: Sequelize.DATE, allowNull: false },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable('crossed_profiles'); },
};
