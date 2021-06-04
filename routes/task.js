// 기본 모듈 Import
var express = require('express');
const db = require('../models');
const catchErrors = require("../lib/async-error");
var router = express.Router();
const { PeerEvaluation, Participation, Employee, Project, Task } = require('../models');

// 라우터 설정
router.get('/project/:project_no', catchErrors(async (req, res) => {
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
    
    res.send([Math.round(endTasks.length / tasks.length * 100)]);

}));

router.get('/employee/:project_no/:emp_no', catchErrors(async (req, res) => {
    let employeeTaskList = [];

    // 직원의 모든 태스크 가져오기
    const tasks = await Task.findAll({
        where: {
            project_no: req.params.project_no,
            emp_no: req.params.emp_no,            
        }
    });

    // 직원의 모든 end 태스크 가져오기
    const endTasks = await Task.findAll({
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

    res.send(employeeTaskList);

}));

// 업무 목록 페이지
router.get('/list', catchErrors(async (req, res, next) => {
	const tasks = await Task.findAll({
		where: {
			emp_no : req.session.user.emp_no
		}
	});

	res.render('task/list', {type: 'personal', tasks : tasks});
}));

router.get('/list/all/:project_no', catchErrors(async (req, res, next) => {
	const tasks = await Task.findAll({
		where: {
			project_no: req.params.project_no
		}
	});

	res.render('task/list', {type: 'project', tasks : tasks});
}));

// 업무 확인 -> 상태 변경됨
router.put('/check/:id', catchErrors(async (req, res, next) => {
	const task = await Task.findOne({
		where: {
			id : req.params.id
		}
	});
	task.current_state = 'progress';
	await task.save();
	req.flash('success', '정상적으로 상태 변경되었습니다.');
	res.redirect('/');
}));

// 업무 제출 페이지
router.get('/submit/:id', catchErrors(async (req, res, next) => {
	const task = await Task.findOne({
		where: {
			id : req.params.id
		}
	});
	res.render('task/submit', {task: task});
}));

// 업무 제출
router.post('/submit/:id', catchErrors(async (req, res, next) => {
	const task = await Task.findOne({
		where: {
			id : req.params.id
		}
	});
	task.submit_url = req.body.url;
	task.current_state = 'end';
	await task.save();

	req.flash('success', '정상적으로 제출되었습니다.');
	res.redirect('/task/list');
}));

module.exports = router;