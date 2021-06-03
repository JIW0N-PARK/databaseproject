const Sequelize = require('sequelize');

module.exports = class Customer extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            customer_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
            },
            customer_name: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            e_mail: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            auth_key: {
                type: Sequelize.STRING(255),
                allowNull: true,
            },
        }, {
            sequelize,
            timestamps: false,
            underscored: false,
            modelName: 'Customer',
            tableName: 'customer',
            paranoid: false,
            charset: 'utf8',
            collate: 'utf8_general_ci',
        });
    }

    static associate(db) {
        // CustomerEvaluation Model과 연결
        db.Customer.hasMany(db.CustomerEvaluationResult, { foreignKey: 'customer_id', sourceKey: 'customer_id'});

        // Project model 연결
        db.Customer.hasMany(db.Project, { foreignKey: 'customer_id', sourceKey: 'customer_id'});
    }
};
