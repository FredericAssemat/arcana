'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('narratives', {
      id:          { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      grimoireId:  { type: Sequelize.UUID, allowNull: false },
      text:        { type: Sequelize.TEXT('long'), allowNull: false },
      model:       { type: Sequelize.STRING, defaultValue: 'claude-sonnet-4-5' },
      tokensUsed:  { type: Sequelize.INTEGER, allowNull: true },
      createdAt:   { type: Sequelize.DATE, allowNull: false },
      updatedAt:   { type: Sequelize.DATE, allowNull: false },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable('narratives'); },
};
