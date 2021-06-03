const Sequelize = require('sequelize');

module.exports = class BestEmployee extends Sequelize.Model {
  static init(sequelize) {
    return super.init({
      best_no:{
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      emp_no: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      month: {
        type: Sequelize.INTEGER,
        allowNull: false,
      }
    }, {
      sequelize,
      timestamps: false,
      underscored: false,
      modelName: 'BestEmployee',
      tableName: 'best_employee',
      paranoid: false,
      charset: 'utf8',
      collate: 'utf8_general_ci',
    });
  }

  static associate(db) {
    // Employee Model과 연결
    db.BestEmployee.belongsTo(db.Employee, { foreignKey: 'emp_no', targetKey: 'emp_no'});
  }
};
