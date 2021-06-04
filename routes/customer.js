var express = require("express");
var router = express.Router();
const Sequelize = require('sequelize');
var Employee = require("../models/employee");
var Project = require('../models/project');
var Participation = require('../models/participation');
var EvaluationItem = require('../models/evaluation_items');
const CustomerEvaluationResult = require("../models/customer_evaluation_result");
const Customer = require("../models/customer");

const catchErrors = require("../lib/async-error");

// 종료된 평가 조회
router.get('/eval/list', catchErrors(async (req, res, next) => {
  const projects = await Project.findAll({
    where: { state: "종료", customer_id: req.session.customer.customer_id },
  });

  res.render('eval/list', {  projects: projects });
}));

// 종료된 프로젝트 평가 페이지
router.get('/eval/evaluate/:project_no', catchErrors(async (req, res, next) => {
  const project = await Project.findOne({
    where: { project_no: req.params.project_no },
    include: [
      {
        model: Employee,
        as: 'project_emp'
      }
    ]
  });

  const participations = await Participation.findAll({ where: { project_no: req.params.project_no }});
  var participationArray = [];
  for(let participation of participations){
    const employee = await Employee.findOne({ where: {emp_no: participation.emp_no}});
    participationArray.push(employee);
  }

  const evaluated = await CustomerEvaluationResult.findAll({
    where: {project_no: req.params.project_no, customer_id: req.session.customer.customer_id},
    attributes: [
      [Sequelize.fn('DISTINCT', Sequelize.col('non_evaluator_emp_no')) ,'non_evaluator_emp_no'],
    ]
  });
  var evaluatedArray = [];
  for(let data of evaluated){
    evaluatedArray.push(data.non_evaluator_emp_no);
  }
  const items = await EvaluationItem.findAll({ where: { evaluation_type: "고객"}});
  return res.render('eval/evaluation_form', 
    { type: "고객", items: items, participations: participationArray, project: project, evaluated: evaluatedArray });
}));

// 평가 저장
router.post('/eval/evaluate/:project_no', catchErrors(async (req, res, next) => {
  const project = await Project.findOne({
    where: { project_no: req.params.project_no }
  });

  const items = await EvaluationItem.findAll({ where: { evaluation_type: "고객"}});
  for(let item of items){
    const result = await CustomerEvaluationResult.create({ 
      customer_id: req.session.customer.customer_id,
      non_evaluator_emp_no: req.body.non_evaluator,
      score: req.body[`score_${item.evaluation_item_no}`],
      content: req.body[`content_${item.evaluation_item_no}`],
      evaluation_item_no: item.evaluation_item_no,
      project_no: project.project_no
    });
  }
  req.flash('success', '정상적으로 등록되었습니다.');
  return res.redirect('/customer/eval/list');
}));

module.exports = router;