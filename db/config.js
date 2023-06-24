require("dotenv").config();
const pg = require('pg');
const { 
  POSTGRES_USER, 
  POSTGRES_PASSWORD, 
  POSTGRES_DATABASE, 
  POSTGRES_HOST, 
  POSTGRES_DIALECT, 
  POSTGRES_PORT } = process.env;

module.exports = {
  development: {
    username: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    database: POSTGRES_DATABASE,
    host: POSTGRES_HOST,
    port: POSTGRES_PORT,
    dialect: pg,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
  test: {
    username: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    database: POSTGRES_DATABASE,
    host: POSTGRES_HOST,
    port: POSTGRES_PORT,
    dialect: pg,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
  production: {
    username: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    database: POSTGRES_DATABASE,
    host: POSTGRES_HOST,
    port: POSTGRES_PORT,
    dialect: pg,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};
