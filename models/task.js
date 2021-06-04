const Sequelize = require('sequelize');

module.exports = class Task extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            title: {
                type: Sequelize.STRING(50),
                allowNull: false,
            },
            content: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            start_date: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW
            },
            end_date: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            current_state: {
                type: Sequelize.ENUM(['uncheck', 'progress', 'verify', 'end']),
                defaultValue: 'uncheck',
            },
            submit_file: {
                type: Sequelize.ENUM(['문서', '엑셀', 'Html/Javascript', 'C#/C/C++', 'Dart/Flutter/Java', 'Python']),
            },
            submit_url: {
                type: Sequelize.TEXT
            }

        }, {
            sequelize,
            timestamps: false,
            underscored: false,
            modelName: 'Task',
            tableName: 'task',
            paranoid: false,
            charset: 'utf8',
            collate: 'utf8_general_ci',
        });
    }

    static associate(db) {
        // Employee Model과 연결
        db.Task.belongsTo(db.Employee, { foreignKey: 'emp_no', targetKey: 'emp_no'});

        // Project Model과 연결
        db.Task.belongsTo(db.Project, { foreignKey: 'project_no', targetKey: 'project_no'});
    }
};