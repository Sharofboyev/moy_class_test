const {Pool} =require("pg");
const config = require("../config");
const router = require("express").Router();
const Joi = require("joi");
const moment = require("moment")

router.get("/", (req, res) => {
    if (req.query.date) req.query.date = req.query.date.split(",")
    if (req.query.teacherIds) req.query.teacherIds = req.query.teacherIds.split(",")
    if (req.query.studentsCount)  req.query.studentsCount = req.query.studentsCount.split(",")
    const {error, value} = Joi.object({
        date: Joi.array().items(Joi.date().optional()).max(2).optional().allow(null),
        status: Joi.number().valid(0, 1).optional(),
        teacherIds: Joi.array().items(Joi.number().optional()).optional().allow(null),
        studentsCount: Joi.array().items(Joi.number()).optional().allow(null),
        page: Joi.number().default(1),
        lessonsPerPage: Joi.number().default(5)
    }).validate(req.query);

    if (error) return res.send({status: 400, message: "Bad request", error: error.details[0].message});
    let teacher_arr = ""
    if (value.teacherIds){
        teacher_arr = "("
        for (let i = 0; i < value.teacherIds.length; i++){
            teacher_arr += value.teacherIds[i] + ","
        }
        teacher_arr = teacher_arr.substr(0, teacher_arr.length - 1) + ")"
    }
    let offset = value.lessonsPerPage * (value.page - 1)
    let params = []
    let query = `
    SELECT 
        t.id, to_char(t.date, 'YYYY-MM-DD') AS date, t.title, t.status, t.teachers, s.students, s.visitCount::integer
    FROM 
    (
        SELECT 
            l.id, l.date::date AS date, l.title, l.status, json_agg(t.*) AS teachers FROM lessons l 
        LEFT JOIN 
            lesson_teachers lt ON lt.lesson_id = l.id 
        LEFT JOIN 
            teachers t ON lt.teacher_id = t.id
        GROUP BY 
            l.id
    ) AS t
    LEFT JOIN (
        SELECT 
            l.id, COALESCE(sum(CASE ls.visit WHEN true THEN 1 WHEN false THEN 0 end), 0) AS visitCount, 
        json_agg(
            CASE WHEN s.id IS NOT NULL THEN json_build_object('id', s.id, 'name', s.name, 'visit', ls.visit)
            end
        ) AS students 
        FROM 
            lessons l 
        LEFT JOIN 
            lesson_students ls ON ls.lesson_id = l.id 
        LEFT JOIN 
            students s ON ls.student_id = s.id
        GROUP BY 
            l.id
    ) AS s 
        ON t.id = s.id WHERE `
    if (value.date) {                                       //filtering via lesson date
        if (value.date.length == 1){
            params.push(value.date[0])
            query += `date = $${params.length} AND `
        }
        else {
            params.push(value.date[0], value.date[1])
            query += `date BETWEEN $${params.length - 1} AND $${params.length} AND `
        }
    }
    if (value.studentsCount) {
        if (value.studentsCount.length == 1){
            params.push(value.studentsCount[0])
            query += `studentsCount = $${params.length} AND `
        }
        else {
            params.push(value.studentsCount[0], value.studentsCount[1])
            query += `studentsCount BETWEEN $${params.length - 1} AND $${params.length} AND `
        }
    }
    if (value.status){
        params.push(value.status)                       //filtering via status of lesson
        query += `status = $${value.status}`
    }
    else {
        query += `status IN (0, 1) `
    }
    let teacherIds = value.teacherIds
    const pool = new Pool(config.DB);
    pool.query(query + ` ORDER BY t.id OFFSET ${offset} LIMIT ${value.lessonsPerPage}`, params, (err, resp) => {
        pool.end()
        if (err){
            console.log(err.message)
            return res.send({status: 500, message: "Internal server error"})
        }
        if (teacherIds){
            resp.rows = resp.rows.filter(value => {
                for (let i = 0; i < value.teachers.length; i++){
                    if (value.teachers[i]){
                        if (teacherIds.includes(value.teachers[i].id)){
                            return true
                        }
                    }
                }
                return false
            })
        }
        return res.send({status: 200, message: "Ok", data: resp.rows})
    })
})

router.post("/lessons", (req, res) => {
    const {error, value} = Joi.object({
        teacherIds: Joi.array().items(Joi.number().integer().required()).min(1).required(),
        title: Joi.string().required(),
        days: Joi.array().items(Joi.number().integer().min(0).max(6)).max(7).min(1).required(),
        firstDate: Joi.date().required(),
        lessonsCount: Joi.number().integer().max(300).required(),
        lastDate: Joi.date().optional()
    }).validate(req.body)
    if (error) {
        return res.send({status: 400, message: "Bad request", error: error.details[0].message})
    }
    let firstDate = moment(value.firstDate), lastDate
    if (value.lastDate) {
        lastDate = moment(value.lastDate)
    } else {
        lastDate = moment(firstDate + 365 * 24 * 3600 * 1000)
    }
    let difference = lastDate.diff(firstDate, 'year')
    if (difference < 0){
        return res.send({status: 400, message: "Bad request", error: "Lastdate could not be less than firstDate"})
    } else if  (difference >= 1) {
        return res.send({status: 400, message: "Bad request", error: "Firstdate and lastdate could not be differ to more than 1 year"})
    }
    let query_lessons = `INSERT INTO lessons (title, date) VALUES `;
    let iterationDay = new moment(firstDate)
    let params = [value.title]
    let i = 1
    while (true){
        if (i > value.lessonsCount || iterationDay > lastDate){
            break;
        }
        if (value.days.includes(iterationDay.get("weekday"))){
            i += 1
            params.push(iterationDay.format("YYYY-MM-DD"))
            query_lessons += `($1, $${i}),`
        }
        iterationDay.add(1, "day")
    }
    query_lessons = query_lessons.substr(0, query_lessons.length - 1) + " RETURNING id, to_char(date, 'YYYY-MM-DD') AS date"
    if (i > 1) {
        const pool = new Pool(config.DB);
        pool.query(query_lessons, params, (err, resp) => {
            if (err){
                console.log(err.message)
                return res.send({status: 500, message: "Internal server error"})
            }
            let query_lesson_teachers = `INSERT INTO lesson_teachers (lesson_id, teacher_id) VALUES `
            params = []
            for (let j = 0; j < value.teacherIds.length; j++){
                params.push(value.teacherIds[j])
                let id = params.length
                for (let k = 0; k < resp.rowCount; k++){
                    query_lesson_teachers += `(${resp.rows[k].id}, $${id}),`
                }
            }
            pool.query(query_lesson_teachers.substr(0, query_lesson_teachers.length - 1), params, (err, resp2) => {
                pool.end()
                if (err){
                    console.log(err.message)
                    return res.send({status: 500, message: "Internal server error"})
                }
                return res.send({status: 200, message: 'Ok', lesson_ids: resp.rows})
            })
        })
    }
    else {
        return res.send({status: 200, message: "There is no any possible days to add a lesson", lesson_ids: []})
    }
})

module.exports = router