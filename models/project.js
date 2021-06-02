const Sequelize = require('sequelize');

module.exports = class Project extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            project_no: {
                type: Sequelize.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
            },
            project_name: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            start_date: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            end_date: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            state: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            description: {
                type: Sequelize.STRING(255),
                allowNull: false
            }
        }, {
            sequelize,
            timestamps: false,
            underscored: false,
            modelName: 'Project',
            tableName: 'project',
            paranoid: false,
            charset: 'utf8',
            collate: 'utf8_general_ci',
        });
    }

    static associate(db) {
        // CustomerEvaluation Model과 연결
        db.Project.hasMany(db.CustomerEvaluation, { foreignKey: 'project_no', sourceKey: 'project_no'});

        // PeerEvaluation Model과 연결
        db.Project.hasMany(db.PeerEvaluation, { foreignKey: 'project_no', sourceKey: 'project_no'});

        // PMEvaluation Model과 연결
        db.Project.hasMany(db.PMEvaluation, { foreignKey: 'project_no', sourceKey: 'project_no'});

        // Employee Model과 연결
        db.Project.belongsToMany(db.Employee, { through: 'Participation', foreignKey: 'project_no'});

        // Employee Model과 연결
        db.Project.belongsTo(db.Employee, { foreignKey: 'pm_no', targetKey: 'emp_no'});

        // Customer Model과 연결
        db.Project.belongsTo(db.Customer, {foreignKey: 'customer_id', targetKey: 'customer_id'});

        // Participation Model 연결
        db.Project.belongsToMany(db.Employee, { through: 'Participation', as: 'project_emp', foreignKey:'project_no' });

        // Task Model과 연결
        db.Project.hasMany(db.Task, { foreignKey: 'project_no', sourceKey: 'project_no'});
        
        // evaluation_result
        db.Project.hasMany(db.PMEvaluationResult, { foreignKey: 'project_no', sourceKey: 'project_no'});
        db.Project.hasMany(db.PeerEvaluationResult, { foreignKey: 'project_no', sourceKey: 'project_no'});
        db.Project.hasMany(db.CustomerEvaluationResult, { foreignKey: 'project_no', sourceKey: 'project_no'});

    }
};
