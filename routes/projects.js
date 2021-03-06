var express = require('express');
var router = express.Router();
const Sequelize = require('sequelize');
var Participation = require('../models/participation');
var Project = require('../models/project');
var Customer = require('../models/customer');
var Employee = require('../models/employee');
var EmpSkill = require('../models/emp_skill');
var Task = require('../models/task');
const Op = Sequelize.Op;
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const catchErrors = require('../lib/async-error');

function isValidDate(start, end) {
  var start_date = new Date(start);
  var end_date = new Date(end);
  if(start_date > end_date){
    return false;
  }
  return true;
}

// 경영진 권한에게 프로젝트 페이지를 보여줌.
router.get('/index', catchErrors(async (req, res, next) => {
  res.render('project/index');
}));

// 사용자가 project List를 조회할 때 요청 -> list.pug
router.get('/list', catchErrors(async (req, res) => {
  let projects = [];
  const participations = await Participation.findAll({
    where: {
      emp_no: req.session.user.emp_no,
    },
  });

  for(let i=0; i<participations.length; i++) {
    const project = await Project.findOne({
      where: {
        project_no: participations[i].project_no,
      },
    });
    projects.push(project);
  }

  return res.render('project/list', { projects: projects });
}));

// 모든 프로젝트 조회
router.get('/list/all', catchErrors(async (req, res) => {
  const projects = await Project.findAll({});
  return res.render('project/list', { projects: projects });
}));

// project detail에 대한 요청 -> details.pug
router.get('/details/:project_no', catchErrors(async (req, res) => {
  //proejct_no, description, pm이름 , customer 이름, 투입 직원 이름 + 직무, 진행 상태

  // 프로젝트 객체 생성
  let project_info = {};

  const project = await Project.findOne({ where: { project_no: req.params.project_no }});

  // 프로젝트 번호, 명, 설명, 상태 구하기
  project_info.project_no = project.project_no;
  project_info.project_name = project.project_name;
  project_info.description = project.description;
  project_info.state = project.state;

  // PM 이름 구하기
  const pm = await Employee.findOne({ where: { emp_no: project.pm_no }});
  if(pm) project_info.pm_name = pm.name;
  else project_info.pm_name = '미정';

  // 고객사 이름 구하기
  const customer = await Customer.findOne({ where: { customer_id: project.customer_id }});
  project_info.customer_name = customer.customer_name;

  // 투입 직원 리스트 전달
  project_info.employees = [];

  const participations = await Participation.findAll({ where: { project_no: req.params.project_no }});
  for(let i=0; i<participations.length; i++) {
    // 투입 직원 객체 생성
    let employee = {};

    // 프로젝트 투입 직원 찾기
    const emp = await Employee.findOne({ where: { emp_no: participations[i].emp_no }});
    employee.name = emp.name;
    employee.duty = participations[i].duty;

    // 투입직원들 객체에 투입 직원 정보 푸쉬
    project_info.employees.push(employee);
  }

  res.render('project/details', { project_info });
}));

// 간트차트 태스크 데이터 가져오는 요청 처리
router.get('/getTasks/:project_no', catchErrors(async (req, res) => {
  let resultList = [];
  
  // 모든 태스크 가져옴
  const tasks = await Task.findAll({
    where: {
      project_no: req.params.project_no,
    },
  });
  
  for(let i=0; i<tasks.length; i++) {
    // rowList 생성
    let rowList = [];
    // id, title, submitFile, start_date, end_date, null, 100, null
    
    rowList.push(String(tasks[i].id));
    rowList.push(tasks[i].title);
    rowList.push(tasks[i].submit_file);
    rowList.push(new Date(tasks[i].start_date));
    rowList.push(new Date(tasks[i].end_date));
    rowList.push(null);
    if(tasks[i].current_state == 'uncheck') rowList.push(0);
    else if(tasks[i].current_state == 'progress') rowList.push(25); 
    else if(tasks[i].current_state == 'verify') rowList.push(90);
    else if(tasks[i].current_state == 'end') rowList.push(100);
    rowList.push(null);
    
    // resultList에 rowList 추가
    resultList.push(rowList);
  }
  
  return res.send(resultList);
}));

// 업무 진척도 조회 페이지
router.get('/checkTask/:project_no', catchErrors(async (req, res) => {
  var projectPercent = 0;
  var employeePercent = 0;
  
  // 모든 태스크 가져오기
  const tasks = await Task.findAll({
    where: { project_no: req.params.project_no }
  });
  
  // 모든 end 태스크 가져오기
  const endTasks = await Task.findAll({
    where: {
      project_no: req.params.project_no,
      current_state: 'end',
    }
  });
  
  // 직원의 모든 태스크 가져오기
  const empTasks = await Task.findAll({
    where: {
      project_no: req.params.project_no,
      emp_no: req.session.user.emp_no,            
    }
  });
  
  // 직원의 모든 end 태스크 가져오기
  const empEndTasks = await Task.findAll({
    where: {
      project_no: req.params.project_no,
      emp_no: req.session.user.emp_no,
      current_state: 'end',
    }
  });
  
  projectPercent = String(Math.round(endTasks.length / tasks.length * 100));
  employeePercent = String(Math.round(empEndTasks.length / empTasks.length * 100));
  
  res.render('project/checkTask', { projectPercent, employeePercent });
}));

// addTask 페이지 응답 
router.get('/addTask/:project_no', catchErrors(async (req, res) => {
  res.render('project/addTask', { project_no: req.params.project_no });
}));

// 업무를 DB에 추가
router.post('/addTask', catchErrors(async (req, res) => {
  const title = req.body.title;
  const content = req.body.content;
  const start_date = req.body.start_date;
  const end_date = req.body.end_date;
  const submit_file = req.body.submit_file;
  const emp_no = req.body.emp_no;
  const project_no = req.body.project_no;
  
  const task = await Task.create({
    title,
    content,
    start_date,
    end_date,
    submit_file,
    emp_no,
    project_no,
  });

  const participation = await Participation.findOne({
    where: {
      emp_no: emp_no,
      project_no: project_no
    }
  });

  if(!participation) {
    const new_participation = await Participation.create({
      emp_no: emp_no,
      project_no: project_no,
      participation_date: start_date,
      participate: 'Y'
    });
  }
  else if(participation.participate == 'N'){
    participation.participate = 'Y';
    await participation.save();
  }


  if(task != null) {
    return res.send('true');
  } else {
    return res.send('false');
  }
}));

// 스킬셋이 HTML & JAVASCRIPT인 직원 리스트 응답
router.get('/addTask/all/HJ', catchErrors(async (req, res) => {
  let empList = await getEmployeesWithSkill([1, 2]);
  console.log(empList);
  res.send(empList);
}));

// 스킬셋이 C# & C/C++인 직원 리스트 응답
router.get('/addTask/all/CCC', catchErrors(async (req, res) => {
  let empList = await getEmployeesWithSkill([3, 4]);
  res.send(empList);
}));

// 스킬셋이 Dart/Flutter & Java 인 직원 리스트 응답
router.get('/addTask/all/DFJ', catchErrors(async (req, res) => {
  let empList = await getEmployeesWithSkill([5, 6]);
  res.send(empList);
}));

// 스킬셋이 Python 인 직원 리스트 응답
router.get('/addTask/all/Python', catchErrors(async (req, res) => {
  let empList = await getEmployeesWithSkill([7]);
  res.send(empList);
}));

// 일반 option에 대한 모든 직원 리스트 응답
router.get('/addTask/all/:project_no', catchErrors(async (req, res) => {
  // 직원 리스트 선언
  let empList = [];
  
  // EmpSkill 가져오기
  const participations = await Participation.findAll({ where: { project_no: req.params.project_no }});
  
  for(let i=0; i<participations.length; i++) {
    // Employee 가져오기
    const emp = await Employee.findOne({ where: { emp_no: participations[i].emp_no }, attributes: ['name']});
    empList.push([participations[i].emp_no, emp.name]);
  }
  
  // 최종 리스트 전달
  res.send(empList);
}));

// 
router.post('/finish/:id', catchErrors(async (req, res) => {
  const project = await Project.findOne({
    where: {
      project_no: req.params.id
    }
  });
  // 인증키 문자열 선언
  let grantKey = "";
  // req body 값 가져오기
  const project_no = project.project_no;
  const customer_id = project.customer_id;
  const start_date = project.start_date;
  

  // start_date값 쪼개기
  let date = new Date(start_date);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const items = [project_no, customer_id, year, month, day];
  
  // 인증키 첫 번째 값: project_no
  grantKey += project_no;
  
  // 인증키 두 번째 값: day
  grantKey += day;
  // 인증키 세 번째 값: 모든 값의 합
  let sum = 0;
  for(let i=0; i<items.length; i++) {
    sum += parseInt(items[i]);
  }

  grantKey += sum;
  
  // 인증키 네 번째 값: year
  grantKey += year;
  
  // 인증키 다섯 번째 값: 모든 값의 곱
  sum = 1;
  for(let i=0; i<items.length; i++) {
    sum *= parseInt(items[i]);
  }
  grantKey += sum;
  
  // 인증키 여섯 번째 값: customer_id
  grantKey += customer_id;
  
  // 인증키 일곱 번째 값: month
  grantKey += month;
  
  // 인증키 아홉 번째 값: 1
  grantKey += "1";
  
  // 고객 모델 가져오기
  const customer = await Customer.findOne({
    where: {
      customer_id: customer_id
    },
  });
  
  // 고객의 인증키 컬럼에 인증키 값 추가하기
  await customer.update({
    auth_key: grantKey,
  });
  
  // 인증키에 대한 이메일 보내기
  sendMail(customer);
  
  req.flash('success', '정상적으로 인증키가 부여되었습니다.');
  return res.redirect('/projects/finish');
}));

router.get("/finish", catchErrors(async (req, res, next) => {
  const end_state_projects = await Project.findAll({ 
    where: { 
      state: "종료"
    },
    include: [
      {
        model: Customer,
        where: {
          auth_key : null
        }
      },
      {
        model: Employee
      }
    ]
  });

  console.log(end_state_projects[0]);

  var today = new Date();

  const end_date_projects = await Project.findAll({ 
    where: {
      state: "진행중",
      end_date: {
        [Op.lte]: today
      } 
    },
    include: [
      {
        model: Customer
      },
      {
        model: Employee
      }
    ]
  });
  res.render("project/finish", { end_state_projects: end_state_projects, end_date_projects: end_date_projects });
}));

router.post("/search", catchErrors(async (req, res, next) => {
  if(!isValidDate(req.body.start, req.body.end)){
    req.flash('danger', '시작 일자가 종료 일자보다 앞설 수 없습니다.');
    return res.redirect('/projects/list');
  }

  const projects = await Project.findAll({
    where: {
      [Op.or] : [
        {
          end_date: {
            [Op.gte]: req.body.start,
            [Op.lte]: req.body.end
          }
        },
        {
          start_date: {
            [Op.lte]: req.body.end
          }
        }
      ]
    }
  });

  res.render("project/list", { projects: projects });
}));

async function getEmployeesWithSkill(skillList) {
  // 직원 리스트 선언
  let empList = [];
  let empNoList = [];
  let empNameList = [];
  
  // EmpSkill 가져오기
  const empSkill = await EmpSkill.findAll({
    where: {
      skill_no: skillList,
    }
  });
  
  // 해당 스킬셋을 가진 직원들에 대해 모든 이름 값을 가져오기 위한 반복문
  for (let i=0; i<empSkill.length; i++) {
    // Employee 가져오기
    const emp = await Employee.findOne({
      where: {
        emp_no: empSkill[i].emp_no,
      },
      attributes: ['name'],
    });
    
    // 모든 직원 추가
    empNoList.push(empSkill[i].emp_no);
    empNameList.push(emp.name);
  }
  
  // 중복 제거
  const set1 = new Set(empNoList);
  const set2 = new Set(empNameList);
  empNoList = [...set1];
  empNameList = [...set2];
  
  
  for (let i=0; i<empNoList.length; i++) {
    empList.push([empNoList[i], empNameList[i]]);
  }

  return empList;
}

async function sendMail(customer) {
  var transporter = nodemailer.createTransport(smtpTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    auth: {
      user: 'mju.databaseproject.2021@gmail.com',
      pass: 'qwerty123456^^'
    }
  }));
   
  var mailOptions = {
    from: "mju.databaseproject.2021@gmail.com",
    to: customer.e_mail,
    subject: '[Prompt Solution] 고객 평가를 위한 인증키 메일',
    text: `
    접속 URL: https://mju-databaseproject-2021.herokuapp.com/
    인증키: ${customer.auth_key}`
  };
   
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  }); 
}

module.exports = router;