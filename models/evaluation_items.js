const Sequelize = require('sequelize');

module.exports = class Employee extends Sequelize.Model {
  static init(sequelize) {
    return super.init({
      evaluation_item_no: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      evaluation_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      item_title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      item_example: {
        type: Sequelize.STRING,
        allowNull: false,
      }
  }, {
      sequelize,
      timestamps: false,
      underscored: false,
      modelName: 'EvaluationItems',
      tableName: 'evaluation_items',
      paranoid: false,
      charset: 'utf8',
      collate: 'utf8_general_ci',
    });
  }

  static associate(db) {
    db.EvaluationItems.hasMany(db.PMEvaluationResult, { foreignKey: 'evaluation_item_no', sourceKey: 'evaluation_item_no'});
    db.EvaluationItems.hasMany(db.PeerEvaluationResult, { foreignKey: 'evaluation_item_no', sourceKey: 'evaluation_item_no'});
    db.EvaluationItems.hasMany(db.CustomerEvaluationResult, { foreignKey: 'evaluation_item_no', sourceKey: 'evaluation_item_no'});
    
  }
};