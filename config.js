require("dotenv").config();

module.exports = {
  APP: {
    port: process.env.API_PORT,
  },
  DB: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    application_name: process.env.APPLICATION_NAME,
  },
  SECRET: process.env.SECRET,
  SESSION_TIMEOUT: process.env.SESSION_TIMEOUT,
};
