require('dotenv').config();
const crypto = require('crypto');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

(async () => {
  try {
    const userEmail = 'paciente2@mediconnect.cl';
    const userResult = await pool.query(
      `SELECT id_usuario FROM usuarios WHERE correo = $1 AND estado = 'activo'`,
      [userEmail]
    );
    if (userResult.rows.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    const userId = userResult.rows[0].id_usuario;
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiration = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query('UPDATE password_reset_tokens SET usado = TRUE WHERE id_usuario = $1 AND usado = FALSE', [userId]);
    await pool.query(
      'INSERT INTO password_reset_tokens (id_usuario, token_hash, expiracion) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiration]
    );

    console.log(`RAW_TOKEN=${resetToken}`);
    console.log(`TOKEN_HASH=${tokenHash}`);
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
