const Sequelize = require('sequelize');

module.exports = class PMEvaluationResult extends Sequelize.Model {
  static init(sequelize) {
    return super.init({
      evaluation_result_no: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      evaluator_emp_no: {
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
      modelName: 'PMEvaluationResult',
      tableName: 'pm_evaluation_result',
      paranoid: false,
      charset: 'utf8',
      collate: 'utf8_general_ci',
    });
  }

  static associate(db) {
    db.EvaluationItems.hasMany(db.PMEvaluationResult, { foreignKey: 'evaluation_item_no', sourceKey: 'evaluation_item_no'});

    // Employee Model과 연결
    db.PMEvaluationResult.belongsTo(db.Employee, { foreignKey: 'evaluator_emp_no', targetKey: 'emp_no'});
    db.PMEvaluationResult.belongsTo(db.Employee, { foreignKey: 'non_evaluator_emp_no', targetKey: 'emp_no'});

    // Project Model과 연결
    db.PMEvaluationResult.belongsTo(db.Project, { foreignKey: 'project_no', targetKey: 'project_no'});
    
  }
};