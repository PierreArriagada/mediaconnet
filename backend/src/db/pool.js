const { Pool } = require('pg');

// Usa la variable de entorno DATABASE_URL inyectada por docker-compose
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Verifica la conexión al iniciar y falla rápido si la BD no responde
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error al conectar con PostgreSQL:', err.message);
    process.exit(1);
  }
  release();
  console.log('Conexión a PostgreSQL establecida.');
});

module.exports = pool;
