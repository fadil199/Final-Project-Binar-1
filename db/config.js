require("dotenv").config();
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
    dialect: 'postgres',
  },
  test: {
    username: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    database: POSTGRES_DATABASE,
    host: POSTGRES_HOST,
    port: POSTGRES_PORT,
    dialect: 'postgres',
  },
  production: {
    username: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    database: POSTGRES_DATABASE,
    host: POSTGRES_HOST,
    port: POSTGRES_PORT,
    dialect: 'postgres',
  },
};
