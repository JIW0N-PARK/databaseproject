var express = require("express");
var router = express.Router();
const Sequelize = require('sequelize');
var Employee = require("../models/employee");
var BestEmployee = require("../models/best_employee");
var EmpSkill = require("../models/emp_skill");
var Project = require('../models/project');
var Participation = require('../models/participation');
var EvaluationItem = require('../models/evaluation_items');
var EvaluationResult = require('../models/evaluation_result');
const catchErrors = require("../lib/async-error");
var bcrypt = require("bcrypt");
const PeerEvaluationResult = require("../models/peer_evaluation_result");
const PmEvaluationResult = require("../models/pm_evaluation_result");
const CustomerEvaluationResult = require("../models/customer_evaluation_result");

function getMonth() {
	let today = new Date();
	let month = today.getMonth() + 1;
	return month;
}

// 종료된 평가 조회
router.get('/list', catchErrors(async (req, res, next) => {
  const projects = await Project.findAll({
    where: { state: "종료" },
    include: [
      {    
        model: Employee,
        as: 'project_emp',
        where: {
          emp_no : req.session.user.emp_no
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

  if(req.session.user.emp_no != project.pm_no) {
    const evaluated = await PeerEvaluationResult.findAll({
      where: {project_no: req.params.project_no, evaluator_emp_no: req.session.user.emp_no},
      attributes: [
        [Sequelize.fn('DISTINCT', Sequelize.col('non_evaluator_emp_no')) ,'non_evaluator_emp_no'],
      ]
    });
    var evaluatedArray = [];
    for(let data of evaluated){
      evaluatedArray.push(data.non_evaluator_emp_no);
    }
    const items = await EvaluationItem.findAll({ where: { evaluation_type: "동료"}});
    return res.render('eval/evaluation_form', 
      { type: "동료", items: items, participations: participationArray, project: project, evaluated: evaluatedArray });
  }
  else {
    const evaluated = await PmEvaluationResult.findAll({
      where: {project_no: req.params.project_no, evaluator_emp_no: req.session.user.emp_no},
      attributes: [
        [Sequelize.fn('DISTINCT', Sequelize.col('non_evaluator_emp_no')) ,'non_evaluator_emp_no'],
      ]
    });
    var evaluatedArray = [];
    for(let data of evaluated){
      evaluatedArray.push(data.non_evaluator_emp_no);
    }
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
      const result = await PeerEvaluationResult.create({ 
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
      const result = await PmEvaluationResult.create({ 
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
  var allEvaluationList = [];
  //모든 프로젝트에 참여자
  const participations = await Participation.findAll({
    where: {
      participate: 'Y'
    }
  });

  //각각의 프로젝트 참여자에 대한 list 생성
  for(let i=0; i<participations.length; i++) {
    let evaluationResult = [];

    // 직원 이름 추가
    const employee = await Employee.findOne({
        where: {
            emp_no: participations[i].emp_no
        },
    });
    evaluationResult.push(employee.emp_no);
    evaluationResult.push(employee.name);
    

    // 프로젝트 이름 추가
    const project = await Project.findOne({
        where: {
            project_no: participations[i].project_no
        },
    });
    evaluationResult.push(project.project_no);
    evaluationResult.push(project.project_name);

    // 동료 평가 점수 추가
    let peer_sum = 0;
    const peer_eval = await PeerEvaluationResult.findAll({
        where: {
            non_evaluator_emp_no: participations[i].emp_no,
            project_no: participations[i].project_no,
        }
    });

    let peer_evaluation_score = 0;
    if(peer_eval.length != 0) {
        for(let j=0; j<peer_eval.length; j++) {
            if(peer_eval[j] != null)
            peer_sum += peer_eval[j].score;
        }
        peer_evaluation_score = Math.round(peer_sum/peer_eval.length);
        evaluationResult.push(peer_evaluation_score + "점");
    }

    if(project.pm_no == employee.emp_no) {
      evaluationResult.push('PM');
    }

    // PM 평가 점수 추가
    let pm_sum = 0;
    const pm_eval = await PmEvaluationResult.findAll({
        where: {
            non_evaluator_emp_no: participations[i].emp_no,
            project_no: participations[i].project_no,
        }
    });

    let pm_evaluation_score = 0;
    if(pm_eval.length != 0) {
        for(let j=0; j<pm_eval.length; j++) {
            if(pm_eval[j] != null)
            pm_sum += pm_eval[j].score;
        }
        pm_evaluation_score = Math.round(pm_sum/pm_eval.length);
        evaluationResult.push(pm_evaluation_score + "점");
    }

    // 고객 평가 점수 추가
    let customer_sum = 0;
    const customer_eval = await CustomerEvaluationResult.findAll({
        where: {
            non_evaluator_emp_no: participations[i].emp_no,
            project_no: participations[i].project_no,
        }
    });

    let customer_evaluation_score = 0;
    if(customer_eval.length != 0) {
        for(let j=0; j<customer_eval.length; j++) {
            if(customer_eval[j] != null)
                customer_sum += customer_eval[j].score;
        }
        customer_evaluation_score = Math.round(customer_sum/customer_eval.length);
        evaluationResult.push(customer_evaluation_score + "점");
    }

    // 총합 점수 추가
    evaluationResult.push(Math.round(peer_evaluation_score + pm_evaluation_score + customer_evaluation_score) + "점");

    // 평균 추가
    evaluationResult.push(Math.round((peer_evaluation_score + pm_evaluation_score + customer_evaluation_score)/3) + "점");

		// 이달의 직원 check
		var currentMonth = getMonth();
		const best = await BestEmployee.findOne({
			where: {
				emp_no: participations[i].emp_no,
				month: currentMonth
			}
		});
		if(best){
			evaluationResult.push("best");
		}
		else{
			evaluationResult.push("0");
		}

    // 평가 정보 리스트 전달
    if(evaluationResult.length == 10)
      allEvaluationList.push(evaluationResult);
  }
  res.render('management/evaluationResult_inquiry', { results: allEvaluationList });
}));

router.post('/result/', catchErrors(async (req, res, next) => {
  if(req.body.type == 'all') {
    var allEvaluationList = [];
    //모든 프로젝트에 참여자
    const participations = await Participation.findAll({
      where: {
        participate: 'Y'
      }
    });

    //각각의 프로젝트 참여자에 대한 list 생성
    for(let i=0; i<participations.length; i++) {
      let evaluationResult = [];

      // 직원 이름 추가
      const employee = await Employee.findOne({
          where: {
              emp_no: participations[i].emp_no
          },
      });
      evaluationResult.push(employee.emp_no);
      evaluationResult.push(employee.name);
      
  
      // 프로젝트 이름 추가
      const project = await Project.findOne({
          where: {
              project_no: participations[i].project_no
          },
      });
      evaluationResult.push(project.project_no);
      evaluationResult.push(project.project_name);

      // 동료 평가 점수 추가
      let peer_sum = 0;
      const peer_eval = await PeerEvaluationResult.findAll({
          where: {
              non_evaluator_emp_no: participations[i].emp_no,
              project_no: participations[i].project_no,
          }
      });

      let peer_evaluation_score = 0;
      if(peer_eval.length != 0) {
          for(let j=0; j<peer_eval.length; j++) {
              if(peer_eval[j] != null)
              peer_sum += peer_eval[j].score;
          }
          peer_evaluation_score = Math.round(peer_sum/peer_eval.length);
          evaluationResult.push(peer_evaluation_score + "점");
      }

      // PM 평가 점수 추가
      let pm_sum = 0;
      const pm_eval = await PmEvaluationResult.findAll({
          where: {
              non_evaluator_emp_no: participations[i].emp_no,
              project_no: participations[i].project_no,
          }
      });

      let pm_evaluation_score = 0;
      if(pm_eval.length != 0) {
          for(let j=0; j<pm_eval.length; j++) {
              if(pm_eval[j] != null)
              pm_sum += pm_eval[j].score;
          }
          pm_evaluation_score = Math.round(pm_sum/pm_eval.length);
          evaluationResult.push(pm_evaluation_score + "점");
      }

      if(project.pm_no == employee.emp_no) {
        evaluationResult.push('PM');
      }

      // 고객 평가 점수 추가
      let customer_sum = 0;
      const customer_eval = await CustomerEvaluationResult.findAll({
          where: {
              non_evaluator_emp_no: participations[i].emp_no,
              project_no: participations[i].project_no,
          }
      });

      let customer_evaluation_score = 0;
      if(customer_eval.length != 0) {
          for(let j=0; j<customer_eval.length; j++) {
              if(customer_eval[j] != null)
                  customer_sum += customer_eval[j].score;
          }
          customer_evaluation_score = Math.round(customer_sum/customer_eval.length);
          evaluationResult.push(customer_evaluation_score + "점");
      }
  
      // 총합 점수 추가
      evaluationResult.push(Math.round(peer_evaluation_score + pm_evaluation_score + customer_evaluation_score) + "점");

      // 평균 추가
      evaluationResult.push(Math.round((peer_evaluation_score + pm_evaluation_score + customer_evaluation_score)/3) + "점");
			
			// 이달의 직원 check
			var currentMonth = getMonth();
			const best = await BestEmployee.findOne({
				where: {
					emp_no: participations[i].emp_no,
					month: currentMonth
				}
			});
			if(best){
				evaluationResult.push("best");
			}
			else{
				evaluationResult.push("0");
			}

      // 평가 정보 리스트 전달
      if(evaluationResult.length == 10)
          allEvaluationList.push(evaluationResult);
    }
    return res.render('management/evaluationResult_inquiry', { results: allEvaluationList });
  }
  else if(req.body.type == 'empName') {
    var allEvaluationList = [];

    const employees = await Employee.findAll({
      where: {
        name: req.body.search
      }
    });

    if(employees.length == 0) {
      req.flash("danger", `${req.body.search}을 가진 직원이 없습니다.`);
	    return res.redirect("/eval/result");
    }

    var participations = [];

    for(let employee of employees) {
      const participation = await Participation.findAll({
        where : {
          emp_no : employee.emp_no,
          participate: 'Y'
        }
      });
      participations.push(participation);
    }

    participations = participations[0];

    //각각의 프로젝트 참여자에 대한 list 생성
    for(let i=0; i<participations.length; i++) {
      let evaluationResult = [];

      // 직원 이름 추가
      const employee = await Employee.findOne({
        where: {
          emp_no: participations[i].emp_no
        },
      });
      evaluationResult.push(employee.emp_no);
      evaluationResult.push(employee.name);
  
      // 프로젝트 이름 추가
      const project = await Project.findOne({
          where: {
            project_no: participations[i].project_no
          },
      });
      evaluationResult.push(project.project_no);
      evaluationResult.push(project.project_name);

      // 동료 평가 점수 추가
      let peer_sum = 0;
      const peer_eval = await PeerEvaluationResult.findAll({
          where: {
              non_evaluator_emp_no: participations[i].emp_no,
              project_no: participations[i].project_no,
          }
      });

      let peer_evaluation_score = 0;
      if(peer_eval.length != 0) {
          for(let j=0; j<peer_eval.length; j++) {
              if(peer_eval[j] != null)
              peer_sum += peer_eval[j].score;
          }
          peer_evaluation_score = Math.round(peer_sum/peer_eval.length);
          evaluationResult.push(peer_evaluation_score + "점");
      }

      // PM 평가 점수 추가
      let pm_sum = 0;
      const pm_eval = await PmEvaluationResult.findAll({
          where: {
              non_evaluator_emp_no: participations[i].emp_no,
              project_no: participations[i].project_no,
          }
      });

      let pm_evaluation_score = 0;
      if(pm_eval.length != 0) {
          for(let j=0; j<pm_eval.length; j++) {
              if(pm_eval[j] != null)
              pm_sum += pm_eval[j].score;
          }
          pm_evaluation_score = Math.round(pm_sum/pm_eval.length);
          evaluationResult.push(pm_evaluation_score + "점");
      }

      if(project.pm_no == employee.emp_no) {
        evaluationResult.push('PM');
      }

      // 고객 평가 점수 추가
      let customer_sum = 0;
      const customer_eval = await CustomerEvaluationResult.findAll({
          where: {
              non_evaluator_emp_no: participations[i].emp_no,
              project_no: participations[i].project_no,
          }
      });

      let customer_evaluation_score = 0;
      if(customer_eval.length != 0) {
          for(let j=0; j<customer_eval.length; j++) {
              if(customer_eval[j] != null)
                  customer_sum += customer_eval[j].score;
          }
          customer_evaluation_score = Math.round(customer_sum/customer_eval.length);
          evaluationResult.push(customer_evaluation_score + "점");
      }
  
      // 총합 점수 추가
      evaluationResult.push(Math.round(peer_evaluation_score + pm_evaluation_score + customer_evaluation_score) + "점");

      // 평균 추가
      evaluationResult.push(Math.round((peer_evaluation_score + pm_evaluation_score + customer_evaluation_score)/3) + "점");
      
      // 이달의 직원 check
      var currentMonth = getMonth();
      const best = await BestEmployee.findOne({
        where: {
          emp_no: participations[i].emp_no,
          month: currentMonth
        }
      });
      if(best){
        evaluationResult.push("best");
      }
      else{
        evaluationResult.push("0");
      }

      // 평가 정보 리스트 전달
      if(evaluationResult.length == 10)
          allEvaluationList.push(evaluationResult);
    }
    return res.render('management/evaluationResult_inquiry', { results: allEvaluationList });
  }
  else if(req.body.type == 'empNum') {
    var allEvaluationList = [];
    //모든 프로젝트에 참여자
    const participations = await Participation.findAll({
        where: {
            emp_no: req.body.search,
            participate: 'Y'
        }
    });

    //각각의 프로젝트 참여자에 대한 list 생성
    for(let i=0; i<participations.length; i++) {
        let evaluationResult = [];

        // 직원 이름 추가
        const employee = await Employee.findOne({
            where: {
                emp_no: participations[i].emp_no
            },
        });
        evaluationResult.push(employee.emp_no);
        evaluationResult.push(employee.name);
    
        // 프로젝트 이름 추가
        const project = await Project.findOne({
            where: {
                project_no: participations[i].project_no
            },
        });
        evaluationResult.push(project.project_no);
        evaluationResult.push(project.project_name);

        // 동료 평가 점수 추가
        let peer_sum = 0;
        const peer_eval = await PeerEvaluationResult.findAll({
            where: {
                non_evaluator_emp_no: participations[i].emp_no,
                project_no: participations[i].project_no,
            }
        });

        let peer_evaluation_score = 0;
        if(peer_eval.length != 0) {
            for(let j=0; j<peer_eval.length; j++) {
                if(peer_eval[j] != null)
                peer_sum += peer_eval[j].score;
            }
            peer_evaluation_score = Math.round(peer_sum/peer_eval.length);
            evaluationResult.push(peer_evaluation_score + "점");
        }

        // PM 평가 점수 추가
        let pm_sum = 0;
        const pm_eval = await PmEvaluationResult.findAll({
            where: {
                non_evaluator_emp_no: participations[i].emp_no,
                project_no: participations[i].project_no,
            }
        });

        let pm_evaluation_score = 0;
        if(pm_eval.length != 0) {
            for(let j=0; j<pm_eval.length; j++) {
                if(pm_eval[j] != null)
                pm_sum += pm_eval[j].score;
            }
            pm_evaluation_score = Math.round(pm_sum/pm_eval.length);
            evaluationResult.push(pm_evaluation_score + "점");
        }

        if(project.pm_no == employee.emp_no) {
          evaluationResult.push('PM');
        }

        // 고객 평가 점수 추가
        let customer_sum = 0;
        const customer_eval = await CustomerEvaluationResult.findAll({
            where: {
                non_evaluator_emp_no: participations[i].emp_no,
                project_no: participations[i].project_no,
            }
        });

        let customer_evaluation_score = 0;
        if(customer_eval.length != 0) {
          for(let j=0; j<customer_eval.length; j++) {
              if(customer_eval[j] != null)
                  customer_sum += customer_eval[j].score;
          }
          customer_evaluation_score = Math.round(customer_sum/customer_eval.length);
          evaluationResult.push(customer_evaluation_score + "점");
        }
        else {
          evaluationResult.push("평가 미완료");
        }
    
        // 총합 점수 추가
        evaluationResult.push(Math.round(peer_evaluation_score + pm_evaluation_score + customer_evaluation_score) + "점");

        // 평균 추가
        evaluationResult.push(Math.round((peer_evaluation_score + pm_evaluation_score + customer_evaluation_score)/3) + "점");
				
				// 이달의 직원 check
				var currentMonth = getMonth();
				const best = await BestEmployee.findOne({
					where: {
						emp_no: participations[i].emp_no,
						month: currentMonth
					}
				});
				if(best){
					evaluationResult.push("best");
				}
				else{
					evaluationResult.push("0");
				}

        // 평가 정보 리스트 전달
        if(evaluationResult.length == 10)
          allEvaluationList.push(evaluationResult);
    }
    return res.render('management/evaluationResult_inquiry', { results: allEvaluationList });
  }
  else {
    var allEvaluationList = [];
    //모든 프로젝트에 참여자
    const participations = await Participation.findAll({
        where : {
          project_no : req.body.search,
          participate: 'Y'
        }
    });

    //각각의 프로젝트 참여자에 대한 list 생성
    for(let i=0; i<participations.length; i++) {
        let evaluationResult = [];

        // 직원 이름 추가
        const employee = await Employee.findOne({
            where: {
                emp_no: participations[i].emp_no
            },
        });
        evaluationResult.push(employee.emp_no);
        evaluationResult.push(employee.name);
    
        // 프로젝트 이름 추가
        const project = await Project.findOne({
            where: {
                project_no: participations[i].project_no
            },
        });
        evaluationResult.push(project.project_no);
        evaluationResult.push(project.project_name);

        // 동료 평가 점수 추가
        let peer_sum = 0;
        const peer_eval = await PeerEvaluationResult.findAll({
            where: {
                non_evaluator_emp_no: participations[i].emp_no,
                project_no: participations[i].project_no,
            }
        });

        let peer_evaluation_score = 0;
        if(peer_eval.length != 0) {
            for(let j=0; j<peer_eval.length; j++) {
                if(peer_eval[j] != null)
                peer_sum += peer_eval[j].score;
            }
            peer_evaluation_score = Math.round(peer_sum/peer_eval.length);
            evaluationResult.push(peer_evaluation_score + "점");
        }

        // PM 평가 점수 추가
        let pm_sum = 0;
        const pm_eval = await PmEvaluationResult.findAll({
            where: {
                non_evaluator_emp_no: participations[i].emp_no,
                project_no: participations[i].project_no,
            }
        });

        let pm_evaluation_score = 0;
        if(pm_eval.length != 0) {
            for(let j=0; j<pm_eval.length; j++) {
                if(pm_eval[j] != null)
                pm_sum += pm_eval[j].score;
            }
            pm_evaluation_score = Math.round(pm_sum/pm_eval.length);
            evaluationResult.push(pm_evaluation_score + "점");
        }

        if(project.pm_no == employee.emp_no) {
          evaluationResult.push('PM');
        }

        // 고객 평가 점수 추가
        let customer_sum = 0;
        const customer_eval = await CustomerEvaluationResult.findAll({
            where: {
                non_evaluator_emp_no: participations[i].emp_no,
                project_no: participations[i].project_no,
            }
        });

        let customer_evaluation_score = 0;
        if(customer_eval.length != 0) {
            for(let j=0; j<customer_eval.length; j++) {
                if(customer_eval[j] != null)
                    customer_sum += customer_eval[j].score;
            }
            customer_evaluation_score = Math.round(customer_sum/customer_eval.length);
            evaluationResult.push(customer_evaluation_score + "점");
        }
    
        // 총합 점수 추가
        evaluationResult.push(Math.round(peer_evaluation_score + pm_evaluation_score + customer_evaluation_score) + "점");

        // 평균 추가
        evaluationResult.push(Math.round((peer_evaluation_score + pm_evaluation_score + customer_evaluation_score)/3) + "점");
				
				// 이달의 직원 check
				var currentMonth = getMonth();
				const best = await BestEmployee.findOne({
					where: {
						emp_no: participations[i].emp_no,
						month: currentMonth
					}
				});
				if(best){
					evaluationResult.push("best");
				}
				else{
					evaluationResult.push("0");
				}

        // 평가 정보 리스트 전달
        if(evaluationResult.length == 10)
            allEvaluationList.push(evaluationResult);
    }
    return res.render('management/evaluationResult_inquiry', { results: allEvaluationList });
  }
}));

router.post('/result/best-employee', catchErrors(async (req, res, next) => {
	console.log(req.body);
	var currentMonth = getMonth();
	if(req.body.select){
		for(let emp_no of req.body.select){
			var best = await BestEmployee.findOne({
				where: {
					emp_no: emp_no,
					month: currentMonth
				}
			});
			if(!best){
				best = await BestEmployee.create({
					emp_no: emp_no,
					month: currentMonth
				});
			}
		}
	}
  if(req.body.cancle){
		for(let emp_no of req.body.cancle){
			var best = await BestEmployee.findOne({
				where: {
					emp_no: emp_no,
					month: currentMonth
				}
			});
			best.destroy();
		}
	}
	req.flash('success', '정상적으로 선정/취소되었습니다.');
	res.redirect('/eval/result');
}));


module.exports = router;