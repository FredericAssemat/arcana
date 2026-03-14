'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('share_tokens', {
      id:             { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      senderId:       { type: Sequelize.UUID, allowNull: false },
      grimoireId:     { type: Sequelize.UUID, allowNull: false },
      token:          { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, unique: true },
      recipientEmail: { type: Sequelize.STRING, allowNull: true },
      expiresAt:      { type: Sequelize.DATE, allowNull: false },
      claimedAt:      { type: Sequelize.DATE, allowNull: true },
      createdAt:      { type: Sequelize.DATE, allowNull: false },
      updatedAt:      { type: Sequelize.DATE, allowNull: false },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable('share_tokens'); },
};
