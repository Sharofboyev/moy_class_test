const express = require("express");
const config = require("./config.js");
const app = express();
app.use(express.json());

const lessons = require("./model/lessons");

app.use("/", lessons);

app.listen(config.APP.port, () => {
    console.log(`Listening to port ${config.APP.port}...`)
})