# moy_class_test
This is the test project from Sharofboyev Sarvar to testing coding skills in Node JS to the company Мой Класс

## how to use
clone the repository from git and in bash run
```[bash]
npm install
```
node version 12+ required

After that, create .env file and write configurations
```[node]
API_PORT=4000
DB_HOST=localhost //You can use another host if database is in there
DB_PORT=5432
DB_PASSWORD=mypassword
DB_NAME=moy_class
DB_USER=postgres
APPLICATION_NAME=moy_class
SECRET=mypassword
```

After saving .env file, run in bash command
```[bash]
npm start
```

# API
GET request to the route "/" will return lessons without any filter.
You can add in query some filters like 
```[url]
localhost:4000?status=1&page=2
```

Allowed filters:
status - 0 or 1.
date - if one, exact match of lesson date, if two separated with comma, will return lessons between given dates.
teacherIds - comma separated ids of teachers, will return lessons at least one of the given teachers attended in.
studentsCount - if only one number, will return lessons which has given number of students will visit, if two integers that is comma separated, will return visited students in given interval.
page - page number, integer, default 1.
lessonsPerPage - will clarify how many lessons should be in page, default 5


POST request to the "/lessons" route

```[url]
localhost:4000/lessons
```

Body: 
teacherIds - id of the teachers that are attended in the class
title - title of the lessons (will be added to all lessons in this query to API)
days - days of the week that lessons will be held
firstDate - starting date of the lessons
lastDate - last date for the lessons (can not differ more than 1 year from firstDate)
lessonsCount - maximum number of lessons will be created (max 300)

