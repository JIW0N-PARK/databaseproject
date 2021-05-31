var express = require("express");
var router = express.Router();
const Sequelize = require('sequelize');
var Employee = require("../models/employee");
var Skill = require("../models/skill");
var EmpSkill = require("../models/emp_skill");
var Project = require('../models/project');
var Participation = require('../models/participation');
var EvaluationItem = require('../models/evaluation_items');
var EvaluationResult = require('../models/evaluation_result');
const catchErrors = require("../lib/async-error");
var bcrypt = require("bcrypt");
const Peer = require("../models/peer_evaluation");

// 종료된 평가 조회
router.get('/list', catchErrors(async (req, res, next) => {
  const projects = await Project.findAll({
    where: { state: "종료" },
    include: [
      {    
        model: Employee,
        as: 'project_emp',
        through: {
          where: { emp_no: req.session.user.emp_no }
        }
      }
    ]
  });

  res.render('eval/list', {  projects: projects });
}));

// 종료된 프로젝트 평가 페이지
router.get('/evaluate/:project_no', catchErrors(async (req, res, next) => {
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

  const evaluated = await EvaluationResult.findAll({
    where: {project_no: req.params.project_no, evaluator_emp_no: req.session.user.emp_no},
    attributes: [
      [Sequelize.fn('DISTINCT', Sequelize.col('non_evaluator_emp_no')) ,'non_evaluator_emp_no'],
    ]
  });
  var evaluatedArray = [];
  for(let data of evaluated){
    evaluatedArray.push(data.non_evaluator_emp_no);
  }

  if(req.session.user.emp_no != project.pm_no) {
    const items = await EvaluationItem.findAll({ where: { evaluation_type: "동료"}});
    return res.render('eval/evaluation_form', 
      { type: "동료", items: items, participations: participationArray, project: project, evaluated: evaluatedArray });
  }
  else {
    const items = await EvaluationItem.findAll({ where: { evaluation_type: "PM"}});
    return res.render('eval/evaluation_form', 
      { type: "PM", items: items, participations: participationArray, project: project, evaluated: evaluatedArray });
  }
}));

// 평가 저장
router.post('/evaluate/:project_no', catchErrors(async (req, res, next) => {
  const project = await Project.findOne({
    where: { project_no: req.params.project_no }
  });

  if(req.session.user.emp_no != project.pm_no) {
    const items = await EvaluationItem.findAll({ where: { evaluation_type: "동료"}});
    for(let item of items){
      const result = await EvaluationResult.create({ 
        evaluator_emp_no: req.session.user.emp_no,
        non_evaluator_emp_no: req.body.non_evaluator,
        score: req.body[`score_${item.evaluation_item_no}`],
        content: req.body[`content_${item.evaluation_item_no}`],
        evaluation_item_no: item.evaluation_item_no,
        project_no: project.project_no
      });
    }
    req.flash('success', '정상적으로 등록되었습니다.');
    return res.redirect('/eval/list');
  }
  else {
    const items = await EvaluationItem.findAll({ where: { evaluation_type: "PM"}});
    for(let item of items){
      const result = await EvaluationResult.create({ 
        evaluator_emp_no: req.session.user.emp_no,
        non_evaluator_emp_no: req.body.non_evaluator,
        score: req.body[`score_${item.evaluation_item_no}`],
        content: req.body[`content_${item.evaluation_item_no}`],
        evaluation_item_no: item.evaluation_item_no,
        project_no: project.project_no
      });
    }
    req.flash('success', '정상적으로 등록되었습니다.');
    return res.redirect('/eval/list');
  }
}));

//평가항목 관리 페이지
router.get('/manage/item', catchErrors(async (req, res, next) => {
  res.render('management/evaluationTypeList', {});
}));

//동료 평가 항목 관리 페이지
router.get('/manage/peer', catchErrors(async (req, res, next) => {
  const items = await EvaluationItem.findAll({ where: { evaluation_type: "동료" } });
  res.render('management/evaluationItemList', { type: '동료', items: items });
}));

//PM 평가 항목 관리 페이지
router.get('/manage/pm', catchErrors(async (req, res, next) => {
  const items = await EvaluationItem.findAll({ where: { evaluation_type: "PM" } });
  res.render('management/evaluationItemList', { type: "PM", items: items });
}));

//고객 평가 항목 관리 페이지
router.get('/manage/customer', catchErrors(async (req, res, next) => {
  const items = await EvaluationItem.findAll({ where: { evaluation_type: "고객" } });
  res.render('management/evaluationItemList', { type: "고객", items: items });
}));

//평가 항목 추가 페이지
router.get('/register/item', catchErrors(async (req, res, next) => {
  res.render('management/registerEvaluation_form');
}));

//평가 항목 추가하기
router.post('/register/item', catchErrors(async (req, res, next) => {
  const item = await EvaluationItem.create({
    evaluation_type: req.body.type,
    item_title: req.body.title,
    item_example: req.body.example
  });
  req.flash('success', '정상적으로 등록되었습니다.');
  res.redirect('/eval/manage/item');
}));

//평가항목 수정 페이지
router.get('/manage/:evaluation_item_no', catchErrors(async (req, res, next) => {
  const item = await EvaluationItem.findOne({ where: { evaluation_item_no: req.params.evaluation_item_no }});
  res.render('management/editEvaluation_form', { type: item.evaluation_type, item: item });
}));

//평가항목 수정
router.put('/manage/:evaluation_item_no', catchErrors(async (req, res, next) => {
  const item = await EvaluationItem.findOne({ where: { evaluation_item_no: req.params.evaluation_item_no }});
  item.item_title = req.body.title;
  item.item_example = req.body.example;
  item.save();
  req.flash('success', '정상적으로 수정되었습니다.');
  res.redirect('/eval/manage/item');
}));

//평가항목 삭제
router.delete('/manage/:evaluation_item_no', catchErrors(async (req, res, next) => {
  const item = await EvaluationItem.findOne({ where: { evaluation_item_no: req.params.evaluation_item_no }});
  item.destroy();
  req.flash('success', '정상적으로 삭제되었습니다.');
  res.redirect('/eval/manage/item');
}));

//평가 결과 조회 페이지
router.get('/result', catchErrors(async (req, res, next) => {
  res.render('management/evaluationResult_inquiry');
}));

module.exports = router;