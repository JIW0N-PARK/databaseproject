var express = require('express');
var Participation = require('../models/participation');
var Project = require('../models/project');
var Customer = require('../models/customer');
var Employee = require('../models/employee');
var EmpSkill = require('../models/emp_skill');
var Task = require('../models/task');

const catchErrors = require('../lib/async-error');
var router = express.Router();

router.get('/list', catchErrors(async (req, res, next) => {
  const projects = await Project.findAll({
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
  res.render('project/list', { projects });
}));

router.get('/index', catchErrors(async (req, res, next) => {
  res.render('project/index');
}));

router.get('/:project_no', catchErrors(async (req, res, next) => {
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
  console.log(project);
  res.render('project/details', { project: project });
}));


// 업무 진척도 조회 페이지
router.get('/tasks/:project_no/:emp_no', catchErrors(async (req, res) => {
  var projectPercent = 0;
  var employeePercent = 0;
  var employee;

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
        emp_no: req.params.emp_no,            
    }
  });

  // 직원의 모든 end 태스크 가져오기
  const empEndTasks = await Task.findAll({
      where: {
          project_no: req.params.project_no,
          emp_no: req.params.emp_no,
          current_state: 'end',
      }
  });

  // 사용자의 verify 태스크 개수 추가
  const verifyTask = await Task.findAll({
      where: {
          project_no: req.params.project_no,
          emp_no: req.params.emp_no,
          current_state: 'verify',
      }
  });

  // 사용자의 progress 태스크 개수 추가
  const progressTask = await Task.findAll({
      where: {
          project_no: req.params.project_no,
          emp_no: req.params.emp_no,
          current_state: 'progress',
      }
  });

  // 사용자의 uncheck 태스크 개수 추가
  const uncheckTask = await Task.findAll({
      where: {
          project_no: req.params.project_no,
          emp_no: req.params.emp_no,
          current_state: 'uncheck',
      }
  });

  projectPercent = String(Math.round(endTasks.length / tasks.length * 100));
  employeePercent = String(Math.round(empEndTasks.length / empTasks.length * 100));

  // employeeTaskList.push(Math.round(endTasks.length / tasks.length * 100));
  // employeeTaskList.push(endTasks.length);
  // employeeTaskList.push(verifyTask.length);
  // employeeTaskList.push(progressTask.length);
  // employeeTaskList.push(uncheckTask.length);

  res.render('project/checkTask', { projectPercent, employeePercent });
}));

// addTask 페이지 응답 
router.get('/addTask', catchErrors(async (req, res) => {
  res.render('project/addTask', {});
}));

// 업무를 DB에 추가
router.post('/addTask', catchErrors(async (req, res) => {
  console.log(req.body);
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
  if(task != null) {
    return res.send('true');
  } else {
    return res.send('false');
  }
}));

// 스킬셋이 HTML & JAVASCRIPT인 직원 리스트 응답
router.get('/addTask/HJ', catchErrors(async (req, res) => {
  // 직원 리스트 선언
  let empList = [];
  let empNoList = [];
  let empNameList = [];

  // EmpSkill 가져오기
  const empSkill = await EmpSkill.findAll({
    where: {
      skill_no: [1, 2],
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
  // 최종 리스트 전달
  res.send(empList);
}));

// 스킬셋이 C# & C/C++인 직원 리스트 응답
router.get('/addTask/CCC', catchErrors(async (req, res) => {
  // 직원 리스트 선언
  let empList = [];
  let empNoList = [];
  let empNameList = [];

  // EmpSkill 가져오기
  const empSkill = await EmpSkill.findAll({
    where: {
      skill_no: [3, 4],
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
  // 최종 리스트 전달
  res.send(empList);
}));

// 스킬셋이 Dart/Flutter & Java 인 직원 리스트 응답
router.get('/addTask/DFJ', catchErrors(async (req, res) => {
  // 직원 리스트 선언
  let empList = [];
  let empNoList = [];
  let empNameList = [];

  // EmpSkill 가져오기
  const empSkill = await EmpSkill.findAll({
    where: {
      skill_no: [5, 6],
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
  // 최종 리스트 전달
  res.send(empList);
}));

// 스킬셋이 Python 인 직원 리스트 응답
router.get('/addTask/Python', catchErrors(async (req, res) => {
  // 직원 리스트 선언
  let empList = [];
  let empNoList = [];
  let empNameList = [];

  // EmpSkill 가져오기
  const empSkill = await EmpSkill.findAll({
    where: {
      skill_no: 7,
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
  // 최종 리스트 전달
  res.send(empList);
}));

// 일반 option에 대한 모든 직원 리스트 응답
router.get('/addTask/all/:project_no', catchErrors(async (req, res) => {
  // 직원 리스트 선언
  let empList = [];

  // EmpSkill 가져오기
  const participations = await Participation.findAll({
    where: {
      project_no: req.params.project_no,
    }
  });
  
  for(let i=0; i<participations.length; i++) {
    // Employee 가져오기
    const emp = await Employee.findOne({
      where: {
        emp_no: participations[i].emp_no,
      },
      attributes: ['name'],
    });

    empList.push([participations[i].emp_no, emp.name]);
  }

  // 최종 리스트 전달
  res.send(empList);
}));

// 
router.post('/finish', catchErrors(async (req, res) => {
  // 인증키 문자열 선언
  let grantKey = "";
  // req body 값 가져오기
  const { project_no, customer_id, start_date } = req.body;
  // start_date값 쪼개기
  const year = start_date.getFullYear();
  const month = start_date.getMonth();
  const day = start_date.getDay();

  const items = [project_no, customer_id, year, month, day];

  // 인증키 첫 번째 값: project_no
  grantKey += project_no;

  // 인증키 두 번째 값: day
  grantKey += day;

  // 인증키 세 번째 값: 모든 값의 합
  let sum = 0;
  for(let item in items) {
    sum += parseInt(item);
  }
  grantKey += sum;

  // 인증키 네 번째 값: year
  grantKey += year;

  // 인증키 다섯 번째 값: 모든 값의 곱
  sum = 1;
  for(let item in items) {
    sum *= parseInt(item);
  }
  grantKey += sum;

  // 인증키 여섯 번째 값: project_no
  grantKey += customer_id;

  // 인증키 일곱 번째 값: month
  grantKey += month;

  // 인증키 아홉 번째 값: 1
  grantKey += "1";

  // 고객 모델 가져오기
  const customer = await Customer.findOne({
    where: {
      customer_id
    },
  });

  // 고객의 인증키 컬럼에 인증키 값 추가하기
  customer.update({
    auth_key: grantKey,
  });

  // 인증키에 대한 이메일 보내기
  // 이메일 보내기

  return res.send('true');
}));
module.exports = router;
