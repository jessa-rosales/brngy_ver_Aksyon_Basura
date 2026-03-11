const Pool = require("pg").Pool;

const pool = new Pool({
  user: "postgres",  
  password: "akotisinatoy",  
  host: "localhost",
  port: 5432,
  database: "brngy_ver"
});

module.exports = pool;