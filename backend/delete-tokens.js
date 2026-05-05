require('dotenv').config();
const pg = require('pg');
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL});

async function cleanup() {
  const client = await pool.connect();
  try {
    // Primero, obtener la contraseña original
    const userResult = await client.query(
      `SELECT id_usuario FROM usuarios WHERE correo = 'paciente2@mediconnect.cl'`
    );
    const id_usuario = userResult.rows[0].id_usuario;

    // Eliminar todos los tokens para este usuario
    await client.query(
      'DELETE FROM password_reset_tokens WHERE id_usuario = $1',
      [id_usuario]
    );
    console.log('✅ Tokens eliminados');
    
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
