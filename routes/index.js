var express = require("express");
var router = express.Router();
var Employee = require("../models/employee");
var Skill = require("../models/skill");
var EmpSkill = require("../models/emp_skill");
var Project = require('../models/project');
const catchErrors = require("../lib/async-error");
var bcrypt = require("bcrypt");
var Department = require("../models/department");
const BestEmployee = require("../models/best_employee");
const Customer = require("../models/customer");

function generateHash(password) {
  return bcrypt.hash(password, 10);
}

function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function getMonth() {
	let today = new Date();
	let month = today.getMonth() + 1;
	return month;
}

function validateForm(form) {
	var name = form.name || "";
	var id = form.id || "";
	var password = form.password || "";

	if (!name) {
		return "이름을 입력해주세요.";
	}

	if (name.length < 2) {
		return "이름은 두 글자 이상 입력해주세요.";
	}

	if (!id) {
		return "ID를 입력해주세요.";
	}

	if (!password) {
		return "비밀번호를 입력해주세요.";
	}

	// if (password !== password_confirmation) {
	//   return '비밀번호가 일치하지 않습니다.';
	// }

	if (password.length < 7) {
		return "비밀번호가 너무 짧습니다. (8자 이상)";
	}

	return null;
}

function getDday(end) {
	let today = new Date();
	let year = today.getFullYear(); // 년도
	let month = today.getMonth() + 1;  // 월
	let day = today.getDate();  // 날짜

	var endArray = end.toString().split(" ");
	var end_date = endArray[0];
	var dateArray = end_date.split("-");

	if(year == dateArray[0]) {
		if(month == dateArray[1]) {
			if(dateArray[2] - day <= 7) {
				return dateArray[2] - day;
			}
		}
	}

	return null;
}

/* GET index listing. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Index" });
});

router.get("/signup", catchErrors(async (req, res, next) => {
  const skills = await Skill.findAll();
  res.render("signup", {skills: skills});
}));

router.route("/signin")
	.get((req, res) => {
		res.render("signin", {});
	})

	.post(
		catchErrors(async (req, res, next) => {

			const user = await Employee.findOne({ where: { ID: req.body.id } });
			if (!user) {
				req.flash("danger", "존재하지 않는 ID 입니다.");
				return res.redirect("/signin");
			}
			console.log('before checkPWD');

			var checkPWD = await comparePassword(req.body.password, user.PWD);

			console.log('after checkPWD');

			if(!checkPWD) {
				req.flash("danger", "비밀번호가 맞지 않습니다.");
				return res.redirect("/signin");
			}

			const projects = await Project.findAll({
				where: {
					state: '진행중'
				},
				include: [
					{    
						model: Employee,
						as: 'project_emp',
						through: {
								where: { emp_no: user.emp_no }
						}
					}
				]
			}); 

			for(let project of projects) {
				var d_day = getDday(project.dataValues.end_date);
				if(d_day) {
					req.flash("warning", `${project.project_name} 프로젝트의 마감일자까지 ${d_day}일 남았습니다.`);
				}
			}

			var currentMonth = getMonth();
			const best = await BestEmployee.findAll({
				where: {
					month: currentMonth
				}
			});

			for(let emp of best){
				const employee = await Employee.findOne({
					where: {
						emp_no : emp.emp_no
					}
				});
				req.flash("success", `'${employee.name}' 님이 이달(${currentMonth}월)의 직원으로 선정되었습니다 !`);
			}
			
			req.session.user = user;
			req.session.authorization = user.authorization_no;
			req.flash("secondary", `${user.name}님 환영합니다!`);
			return res.redirect("/");
		})
	);

router.post("/signup", catchErrors(async (req, res, next) => {
	console.log(req.body);

	var err = validateForm(req.body);
	if (err) {
		req.flash("danger", err);
		return res.redirect("back");
	}

	var user = await Employee.findOne({ where: {ID: req.body.id} });

	if (user) {
		req.flash("danger", "이미 존재하는 ID 입니다.");
		return res.redirect("back");
	}

	var password = await generateHash(req.body.password);

	user = await Employee.create({
		name: req.body.name,
		ID: req.body.id,
		PWD: password,
		dept_no: req.body.department,
		authorization_no: 0,
		education: req.body.education
	});

	for(let skill of req.body.skills) {
		await EmpSkill.create({
			emp_no: user.emp_no,
			skill_no: skill
		});
	}

	req.flash("success", "정상적으로 회원가입되었습니다.");
	res.redirect("/");
}));

router.get("/signout", (req, res, next) => {
	delete req.session.user;
	delete req.session.customer;
	req.flash("success", "정상적으로 로그아웃 되었습니다.");
	res.redirect("/");
});

router.get('/mypage', catchErrors(async (req, res, next) => {
	const employee = await Employee.findOne({ 
		where: {emp_no: req.session.user.emp_no},
		include: [
      {
        model: Skill,
        as: 'emp_skill'
      },
			{
				model: Department
			}
		]
	});

	res.render('mypage/index', {employee: employee});
}));

router.get('/mypage/edit', catchErrors(async (req, res, next) => {
	const employee = await Employee.findOne({ 
		where: {emp_no: req.session.user.emp_no},
	});

	const emp_skill = await EmpSkill.findAll({
		where: {emp_no: req.session.user.emp_no}
	});
	var skillArray = [];
	for(let skill of emp_skill){
		skillArray.push(skill.skill_no);
	}
	
	const skills = await Skill.findAll();
	res.render('mypage/editProfile',{employee: employee, skills: skills, emp_skill: skillArray});
}));

router.put('/mypage/:id', catchErrors(async (req, res, next) => {
	const employee = await Employee.findOne({ 
		where: {emp_no: req.params.id},
	});

	const emp_skill = await EmpSkill.findAll({
		where: {emp_no: req.params.id}
	});

	for(let skill of emp_skill){
		await skill.destroy();
	}

	var password = await generateHash(req.body.password);

	employee.name = req.body.name;
	employee.PWD = password;
	employee.education = req.body.education;

	for(let skill of req.body.skills) {
		await EmpSkill.create({
			emp_no: req.params.id,
			skill_no: skill
		});
	}

	await employee.save();
	req.flash('success', '정상적으로 수정되었습니다.');
	res.redirect('/mypage');
}));

router.post('/signin/customer', catchErrors(async (req, res, next) => {
	const customer = await Customer.findOne({
		where: { e_mail: req.body.email }
	});

	if (!customer) {
		req.flash("danger", "존재하지 않는 email 입니다.");
		return res.redirect("back");
	}

	if(!customer.auth_key) {
		req.flash("danger", "인증키가 부여되지 않았습니다.");
		return res.redirect("/signin");
	}

	if(customer.auth_key != req.body.authKey) {
		req.flash("danger", "올바른 인증키가 아닙니다.");
		return res.redirect("/signin");
	}

	req.session.customer = customer;
	req.flash("secondary", `${customer.customer_name} 고객님 환영합니다!`);
	return res.redirect("/");
}));


module.exports = router;
