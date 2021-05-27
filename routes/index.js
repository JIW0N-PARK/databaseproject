var express = require("express");
var router = express.Router();
var Employee = require("../models/employee");
var Skill = require("../models/skill");
var EmpSkill = require("../models/emp_skill");
var Project = require('../models/project');
const catchErrors = require("../lib/async-error");
var bcrypt = require("bcrypt");
const Peer = require("../models/peer_evaluation");
const admin = require("firebase-admin");

let serAccount = require("../node-7fe56-firebase-adminsdk-6a08y-3ebbb95309.json");

admin.initializeApp({
    credential: admin.credential.cert(serAccount),
});

express().set("admin", admin);

function generateHash(password) {
    return bcrypt.hash(password, 10);
}

function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
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
            console.log(req.body);

            const user = await Employee.findOne({ where: { ID: req.body.id } });
            if (!user) {
                req.flash("danger", "존재하지 않는 ID 입니다.");
                return res.redirect("back");
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
            
            req.session.user = user;
            req.session.authorization = user.authorization_no;
            req.flash("success", `${user.name}님 환영합니다!`);
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
    req.flash("success", "정상적으로 로그아웃 되었습니다.");
    res.redirect("/");
});

router.get("/test", function (req, res, next) {
    res.render("index2", { title: "Express", name: "han sh" });
});

module.exports = router;
