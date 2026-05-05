require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.query(
  "select indexname, indexdef from pg_indexes where tablename = 'password_reset_tokens'",
  (err, res) => {
    if (err) {
      console.error('Error reading indexes:', err.message);
      process.exit(1);
    }
    console.log(JSON.stringify(res.rows, null, 2));
    pool.end();
  }
);
