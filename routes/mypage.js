var express = require('express');
var router = express.Router();
const catchErrors = require("../lib/async-error");

const { Skill, EmpSkill, Employee } = require("../models");

router.get("/", async (req, res) => {
    let mySkillList = [];
    console.log('hi');
    console.log('===========================================================');
    const user = await Employee.findOne({
        where: { emp_no: req.session.user.emp_no },
    });
    const empSkills = await EmpSkill.findAll({
        where: {
            emp_no: req.session.user.emp_no,
        },
        attributes: ["skill_no"],
    });
    for(let i=0; i<empSkills.length; i++) {
        const mySkills = await Skill.findOne( {
            where: {
                skill_no: empSkills[i].skill_no,
            }
        });
        console.log(mySkills);
        mySkillList.push(mySkills.sklil_name);
    }
    console.log(user.name);
    console.log(user.ID);
    console.log(user.PWD);
    console.log(user.education);
    console.log(user.work_experience);

    res.render('mypage/mypageview', {
        name: user.name,
        id: user.ID,
        pwd: user.PWD,
        education: user.education,
        userSkills: mySkillList,
        work_experience: user.work_experience,
    });
});

/*개인정보 수정*/
router.get("/edit", catchErrors(async (req, res, next) => {
    const employee = await Employee.findOne({ where: { emp_no: req.session.user.emp_no } });
    const skills = await Skill.findAll();
    res.render("mypage/myProfileEdit", {employee: employee, skills: skills});
}));

router.post(`/edit/:emp_no`, catchErrors(async (req, res, next) => {
    const employee = await Employee.findOne({ where: { emp_no: req.params.emp_no } });
    employee.name = req.body.name;
    employee.education = req.body.education;

    const emp_skills = await EmpSkill.findAll({
        where: {emp_no : req.params.emp_no}
    });

    for(let emp_skill of emp_skills){
        await emp_skill.destroy();
    }

    for(let skill of req.body.skills) {
        await EmpSkill.create({
            emp_no: employee.emp_no,
            skill_no: skill
        });
    }

    await employee.save();
    res.render('index');
}));

module.exports = router;