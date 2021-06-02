// 기본 모듈 Import
var express = require('express');
var router = express.Router();
const catchErrors = require("../lib/async-error");
const { Project, Employee, Participation, PeerEvaluationResult, PMEvaluationResult, CustomerEvaluationResult} = require('../models');


router.get('/peer', async (req, res, next) => {
    res.render('evaluation/peer_evaluation');
});

router.get('/pm', async (req, res) => {
    res.render('evaluation/pm_evaluation');
});

router.get('/customer', async (req, res) => {
    res.render('evaluation/customer_evaluation');
});

router.get('/inputPm_evaluation', async (req, res) => {
    res.render('evaluation/inputPm_evaluation.');
});

router.get('/inputCustomer_evaluation', async (req, res) => {
    res.render('evaluation/inputCustomer_evaluation.');
});

router.get('/inquiry', async (req, res) => {
    res.render('management/evaluationResult_inquiry');
});

router.get('/evaluate', async(req, res) => {
    res.render('management/registerEvaluation');
});

router.get('/index', async(req, res) => {
    res.render('evaluation/index');
});

router.get('/project_list', catchErrors(async (req, res) => {
    // 빈 리스트
    var project_list = [];

    // 모든 프로젝트를 가져옴
    const projects = await Project.findAll({
        attributes: ['project_no', 'project_name']
    });

    // 모든 프로젝트의 정보를 담음 (project_no, project_name) 쌍으로
    for(let i=0; i<projects.length; i++) {
      project_list.push([projects[i].project_no, projects[i].project_name]);
    }
    
    // 참여한 리스트 전달
    res.send(project_list);
}));

router.get('/employee_list/:project_no', catchErrors(async (req, res) => {
    // 빈 리스트
    var employee_list = [];

    // 해당 프로젝트에 대해 참여하고 있는 참여직원 튜플들을 가져옴
    const participations = await Participation.findAll({
        where: {
            project_no: req.params.project_no
        },
    });

    // 모든 프로젝트의 정보를 담음 (employee_no, employee_name) 쌍으로
    for(let i=0; i<participations.length; i++) {
        const employee = await Employee.findOne({
            where: { emp_no: participations[i].emp_no },
            attributes: ['name'],
        });
        employee_list.push([participations[i].emp_no, employee.name]);
    }
    
    // 참여한 리스트 전달
    res.send(employee_list);
}));

// 모든 프로젝트의 직원들에 대한 평가 리스트를 
router.get('/result/all', catchErrors(async (req, res) => {
    var allEvaluationList = [];
    //모든 프로젝트에 참여자
    const participations = await Participation.findAll({});

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
        else {
            evaluationResult.push("평가 미완료");
        }

        // PM 평가 점수 추가
        let pm_sum = 0;
        const pm_eval = await PMEvaluationResult.findAll({
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
        else {
            evaluationResult.push("평가 미완료");
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
        evaluationResult.push(Math.round(peer_evaluation_score + pm_evaluation_score + customer_evaluation_score) + "점!");

        // 평균 추가
        evaluationResult.push(Math.round((peer_evaluation_score + pm_evaluation_score + customer_evaluation_score)/3) + "점!");

        // 평가 정보 리스트 전달
        if(evaluationResult.length == 8)
            allEvaluationList.push(evaluationResult);
    }

    res.send(allEvaluationList);
}));

router.get('/result/empName/:emp_name', catchErrors(async (req, res) => {
    var allEvaluationList = [];

    const employees = await Employee.findAll({
        where: {
            emp_name: req.params.emp_name
        }
    });

    if(employees.length == 0) {
        req.flash("danger", `${req.params.emp_name}을 가진 직원이 없습니다.`);
	    return res.redirect("/eval/result");
    }

    var participations = [];

    for(let employee in employees) {
        const participation = await Participation.findOne({
            where : {
                emp_no: employee.emp_no
            }
        });
        participations.push(participation);
    }

    //각각의 프로젝트 참여자에 대한 list 생성
    for(let i=0; i<participations.length; i++) {
        let evaluationResult = [];

        // 직원 이름 추가
        evaluationResult.push(req.params.emp_name);
    
        // 프로젝트 이름 추가
        const project = await Project.findOne({
            where: {
                project_no: participations[i].project_no
            },
        });
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
        else {
            evaluationResult.push("평가 미완료");
        }

        // PM 평가 점수 추가
        let pm_sum = 0;
        const pm_eval = await PMEvaluationResult.findAll({
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
        else {
            evaluationResult.push("평가 미완료");
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
        evaluationResult.push(Math.round(peer_evaluation_score + pm_evaluation_score + customer_evaluation_score) + "점!");

        // 평균 추가
        evaluationResult.push(Math.round((peer_evaluation_score + pm_evaluation_score + customer_evaluation_score)/3) + "점!");

        // 평가 정보 리스트 전달
        if(evaluationResult.length == 8)
            allEvaluationList.push(evaluationResult);
    }

    res.send(allEvaluationList);
}));

router.get('/result/empNum/:emp_no', catchErrors(async (req, res) => {
    var allEvaluationList = [];
    //모든 프로젝트에 참여자
    const participations = await Participation.findAll({
        where: {
            emp_no: req.params.emp_no,
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
        evaluationResult.push(employee.name);
    
        // 프로젝트 이름 추가
        const project = await Project.findOne({
            where: {
                project_no: participations[i].project_no
            },
        });
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
        else {
            evaluationResult.push("평가 미완료");
        }

        // PM 평가 점수 추가
        let pm_sum = 0;
        const pm_eval = await PMEvaluationResult.findAll({
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
        else {
            evaluationResult.push("평가 미완료");
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
        evaluationResult.push(Math.round(peer_evaluation_score + pm_evaluation_score + customer_evaluation_score) + "점!");

        // 평균 추가
        evaluationResult.push(Math.round((peer_evaluation_score + pm_evaluation_score + customer_evaluation_score)/3) + "점!");

        // 평가 정보 리스트 전달
        if(evaluationResult.length == 8)
            allEvaluationList.push(evaluationResult);
    }

    res.send(allEvaluationList);
}));

router.get('/result/projectName/:project_no', catchErrors(async (req, res) => {
    var allEvaluationList = [];
    //모든 프로젝트에 참여자
    const participations = await Participation.findAll({
        where : {
            project_no : req.params.project_no
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
        evaluationResult.push(employee.name);
    
        // 프로젝트 이름 추가
        const project = await Project.findOne({
            where: {
                project_no: participations[i].project_no
            },
        });
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
        else {
            evaluationResult.push("평가 미완료");
        }

        // PM 평가 점수 추가
        let pm_sum = 0;
        const pm_eval = await PMEvaluationResult.findAll({
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
        else {
            evaluationResult.push("평가 미완료");
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
        evaluationResult.push(Math.round(peer_evaluation_score + pm_evaluation_score + customer_evaluation_score) + "점!");

        // 평균 추가
        evaluationResult.push(Math.round((peer_evaluation_score + pm_evaluation_score + customer_evaluation_score)/3) + "점!");

        // 평가 정보 리스트 전달
        if(evaluationResult.length == 8)
            allEvaluationList.push(evaluationResult);
    }

    res.send(allEvaluationList);
}));

// 특정 프로젝트의 특정 직원에 대한 평과 결과들에 대한 리스트 응답 
router.get('/result/:emp_no/:project_no', catchErrors(async (req, res) => {
    // 빈 리스트
    var evaluation_result_list = [];

    
    evaluation_result_list.push(project.project_name);
    // 동료 평가에 대한 평가 점수들의 평균을 푸쉬하기 위한 과정
    const peer_result = await PeerEvaluation.findOne({
        where: {
            project_no: req.params.project_no,
            non_evaluator_no: req.params.emp_no
        },
    });
    
    evaluation_result_list.push(evaluation_score1);
    // PM 평가에 대한 평가 점수들의 평균을 푸쉬하기 위한 과정
    const pm_result = await PMEvaluation.findOne({
        where: {
            project_no: req.params.project_no,
            non_evaluator_no: req.params.emp_no
        },
    });
    var evaluation_score2 = (pm_result.evaluation_score1 + pm_result.evaluation_score2)/2;
    evaluation_result_list.push(evaluation_score2);
    // 고객 평가에 대한 평가 점수들의 평균을 푸쉬하기 위한 과정
    const customer_result = await CustomerEvaluation.findOne({
        where: {
            project_no: req.params.project_no,
            non_evaluator_no: req.params.emp_no
        },
    });
    var evaluation_score3 = (customer_result.evaluation_score1 + customer_result.evaluation_score2)/2;
    evaluation_result_list.push(evaluation_score3);
    
    
}));

module.exports = router;