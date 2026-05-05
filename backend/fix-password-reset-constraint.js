require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

(async () => {
  try {
    await pool.query(`
      ALTER TABLE password_reset_tokens
      DROP CONSTRAINT IF EXISTS uq_reset_tokens_usuario_activo;

      CREATE UNIQUE INDEX IF NOT EXISTS uq_reset_tokens_usuario_activo
        ON password_reset_tokens (id_usuario)
        WHERE usado = FALSE;
    `);
    console.log('✅ Constraint updated: partial unique index created.');
  } catch (err) {
    console.error('❌ Error updating constraint:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
