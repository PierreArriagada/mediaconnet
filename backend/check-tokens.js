require('dotenv').config();
const pg = require('pg');
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL});

pool.query(`SELECT id_token, id_usuario, usado, expiracion FROM password_reset_tokens 
WHERE id_usuario IN (SELECT id_usuario FROM usuarios WHERE correo = 'paciente2@mediconnect.cl')
ORDER BY id_token DESC`, 
async (err, res) => {
  if(err) console.error(err);
  else {
    console.log('Tokens actuales para paciente2@mediconnect.cl:');
    console.log(JSON.stringify(res.rows, null, 2));
  }
  await pool.end();
});
