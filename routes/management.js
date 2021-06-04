var express = require("express");
const Sequelize = require('sequelize');
var router = express.Router();
var Employee = require("../models/employee");
var Participation = require("../models/participation");
var Customer = require("../models/customer");
var Project = require("../models/project");
var EvaluationItem = require('../models/evaluation_items');
const catchErrors = require("../lib/async-error");

const Op = Sequelize.Op;

function isValidDate(start, end) {
  var start_date = new Date(start);
  var end_date = new Date(end);
  if(start_date > end_date){
    return false;
  }
  return true;
}

router.get('/', function (req, res, next) {
  res.render('management/index',{});
});

router.get('/customer/register', catchErrors(async (req, res, next) => {
  res.render('management/registerCustomer', {});
}));

router.get('/customer/list', catchErrors(async (req, res, next) => {
  const customers = await Customer.findAll();
  res.render('management/customerList', {customers: customers});
}));

router.post('/customer/register', catchErrors(async (req, res, next) => {
  const customer = await Customer.create({
    customer_name: req.body.name,
    e_mail: req.body.email
  });
  req.flash("success", "정상적으로 등록되었습니다.");
  res.redirect('/');
}));

router.get('/project/register', catchErrors(async (req, res, next) => {
  const customers = await Customer.findAll();
  const marketing = await Employee.findAll({ where: { dept_no: 1 } });
  const research = await Employee.findAll({ where: { dept_no: 2 } });
  const business = await Employee.findAll({ where: { dept_no: 3 } });
  const development = await Employee.findAll({ where: { dept_no: 4 } });
  const employees = await Employee.findAll({ where: { authorization_no: 1 } });
  res.render('management/registerProject', { 
    customers: customers, marketing: marketing, 
    research: research, business: business, development: development, employees: employees });
}));

router.post('/project/register', catchErrors(async (req, res, next) => {

  if(!isValidDate(req.body.start, req.body.end)){
    req.flash('danger', '시작 일자가 종료 일자보다 앞설 수 없습니다.');
    return res.redirect('/projects/index');
  }
  const project = await Project.create({
    project_name: req.body.name,
    start_date: req.body.start,
    end_date: req.body.end,
    state: req.body.state,
    description: req.body.description,
    customer_id: req.body.customer,
    pm_no: req.body.pm
  });

  for(let employee of req.body.employee) {
    await Participation.create({
      emp_no: employee,
      project_no: project.project_no,
      participation_date: project.start_date,
      participate: "Y"
    });
  }

  req.flash('success', '정상적으로 등록되었습니다.');
  res.render('management/index');
}));

router.get('/project/edit/:project_no', catchErrors(async (req, res, next) => {
  const customers = await Customer.findAll();
  const marketing = await Employee.findAll({ where: { dept_no: 1 } });
  const research = await Employee.findAll({ where: { dept_no: 2 } });
  const business = await Employee.findAll({ where: { dept_no: 3 } });
  const development = await Employee.findAll({ where: { dept_no: 4 } });
  const project = await Project.findOne({
    where: { project_no: req.params.project_no },
    include: [
      {
        model: Employee,
        as: 'project_emp'
      },
      {
        model: Customer
      }
    ]
  });
  res.render('management/editProject', { project: project,
    customers: customers, marketing: marketing, research: research, business: business, development: development });
}));

router.post('/project/edit/:project_no', catchErrors(async (req, res, next) => {
  const project = await Project.findOne({ where: {project_no: req.params.project_no} });
  project.project_name = req.body.name;
  project.start_date = req.body.start;
  project.end_date = req.body.end;
  project.state = req.body.state;
  project.description = req.body.description;
  project.customer_id = req.body.customer;
  await project.save();

  const participations = await Participation.findAll({ where: { project_no: req.params.project_no } });
  for(let participation of participations) {
    participation.participate = "N";
    await participation.save();
  }

  for(let employee of req.body.employee) {
    const participation = await Participation.findOne({ where: { emp_no: employee, project_no: req.params.project_no } });
    if(participation) {
      participation.participate = "Y";
      await participation.save();
    }
    else{
      await Participation.create({
        emp_no: employee,
        project_no: project.project_no,
        participation_date: project.start_date,
        participate: "Y"
      });
    }
  }
  req.flash("success", "성공적으로 수정되었습니다.");
  res.render('management/index');
}));

router.get('/project/delete/:project_no', catchErrors(async (req, res, next) => {
  const project = await Project.findOne({
    where: { project_no: req.params.project_no },
    include: [
      {
        model: Employee,
        as: 'project_emp'
      },
      {
        model: Customer
      }
    ]
  });

  for(let employee of project.project_emp) {
    const participation = await Participation.findOne({ where: { emp_no: employee.emp_no, project_no: req.params.project_no } });
    await participation.destroy();
  }

  await project.destroy();

  res.render('management/index');
}));

router.get('/project/search', catchErrors(async (req, res, next) => {
  res.render('management/searchProject', {projects: null});
}));

router.post('/project/search', catchErrors(async (req, res, next) => {
  console.log(req.body);

  const projects = await Project.findAll({
    where: {
      [Op.or] : [
        {end_date: {
          [Op.gte]: req.body.search_start
        }},
        {start_date: {
          [Op.lte]: req.body.search_end
        }}
      ]
    },
    include: [
      {
        model: Employee,
        as: 'project_emp'
      },
      {
        model: Customer
      }
    ]
  });
  res.render('management/searchProject', { projects: projects });
}));

router.get('/evaluation/list', catchErrors(async (req, res, next) => {
  res.render('management/evaluationTypeList', {});
}));

router.get('/evaluation/peer/manage', catchErrors(async (req, res, next) => {
  const items = await EvaluationItem.findAll({ where: { evaluation_type: "동료" } });
  res.render('management/evaluationItemList', { type: '동료', items: items });
}));

router.get('/evaluation/pm/manage', catchErrors(async (req, res, next) => {
  const items = await EvaluationItem.findAll({ where: { evaluation_type: "PM" } });
  res.render('management/evaluationItemList', { type: "PM", items: items });
}));

router.get('/evaluation/customer/manage', catchErrors(async (req, res, next) => {
  const items = await EvaluationItem.findAll({ where: { evaluation_type: "고객" } });
  res.render('management/evaluationItemList', { type: "고객", items: items });
}));

router.get('/evaluation/register', catchErrors(async (req, res, next) => {
  res.render('management/registerEvaluation_form', { });
}));

router.post('/evaluation/register', catchErrors(async (req, res, next) => {
  const item = await EvaluationItem.create({
    evaluation_type: req.body.type,
    item_title: req.body.title,
    item_example: req.body.example
  });

  if(req.body.type=='동료') {
    const items = await EvaluationItem.findAll({ where: { evaluation_type: "동료" } });
    res.render('management/evaluationItemList', { type: '동료', items: items });
  }
  else if(req.body.type=='PM') {
    const items = await EvaluationItem.findAll({ where: { evaluation_type: "PM" } });
    res.render('management/evaluationItemList', { type: "PM", items: items });
  }
  else {
    const items = await EvaluationItem.findAll({ where: { evaluation_type: "고객" } });
    res.render('management/evaluationItemList', { type: "고객", items: items });
  }
  res.render('management/evaluationTypeList', {});
}));

router.get('/evaluation/:evaluation_item_no/delete', catchErrors(async (req, res, next) => {
  const item = await EvaluationItem.findOne({ where: { evaluation_item_no: req.params.evaluation_item_no }});
  item.destroy();
  res.render('management/evaluationTypeList', {});
}));

router.post('/project/state/end/:project_no', catchErrors(async (req, res, next) => {
  const project = await Project.findOne({ where: { project_no: req.params.project_no }});
  project.state = "종료";
  project.save();
  res.redirect('back');
}));

router.get('/customer/:id/edit', catchErrors(async (req, res, next) => {
  const customer = await Customer.findOne({ where: { customer_id: req.params.id}});
  res.render('management/editCustomer', { customer: customer });
}));

//put
router.put('/customer/:id', catchErrors(async (req, res, next) => {
  const customer = await Customer.findOne({ where: { customer_id: req.params.id}});
  customer.customer_name = req.body.name;
  customer.e_mail = req.body.email;
  await customer.save();
  req.flash('success', "성공적으로 수정되었습니다.");
  res.render('management/index');
}));

router.delete('/customer/:id', catchErrors(async (req, res, next) => {
  const customer = await Customer.findOne({ where: { customer_id: req.params.id}});
  await customer.destroy();
  req.flash('success', "성공적으로 삭제되었습니다.");
  res.render('management/index');
}));

module.exports = router;
