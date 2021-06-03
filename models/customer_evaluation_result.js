const Sequelize = require('sequelize');

module.exports = class CustomerEvaluationResult extends Sequelize.Model {
  static init(sequelize) {
    return super.init({
      evaluation_result_no: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      non_evaluator_emp_no: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      score: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      content: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      evaluation_item_no: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      project_no: {
        type: Sequelize.INTEGER,
        allowNull: false,
      }
  }, {
      sequelize,
      timestamps: false,
      underscored: false,
      modelName: 'CustomerEvaluationResult',
      tableName: 'customer_evaluation_result',
      paranoid: false,
      charset: 'utf8',
      collate: 'utf8_general_ci',
    });
  }

  static associate(db) {
    db.EvaluationItems.hasMany(db.CustomerEvaluationResult, { foreignKey: 'evaluation_item_no', sourceKey: 'evaluation_item_no'});

    // Employee Model과 연결
    db.CustomerEvaluationResult.belongsTo(db.Employee, { foreignKey: 'non_evaluator_emp_no', targetKey: 'emp_no'});

    // Project Model과 연결
    db.CustomerEvaluationResult.belongsTo(db.Project, { foreignKey: 'project_no', targetKey: 'project_no'});

    db.CustomerEvaluationResult.belongsTo(db.Customer, { foreignKey: 'customer_id', targetKey: 'customer_id'});
    
  }
};