require('dotenv').config();
const pg = require('pg');
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL});

pool.query(
  `UPDATE password_reset_tokens SET usado = TRUE 
   WHERE id_usuario IN (SELECT id_usuario FROM usuarios WHERE correo = $1) 
   AND usado = FALSE`,
  ['paciente2@mediconnect.cl'],
  (err, res) => {
    if(err) console.error('Error:', err);
    else console.log('Tokens updated:', res.rowCount);
    pool.end();
  }
);
