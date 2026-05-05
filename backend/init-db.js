const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const adminPool = new Pool({
  connectionString: 'postgresql://postgres:Ppackkck-acm1pt@localhost:5432/postgres'
});

const appPool = new Pool({
  connectionString: 'postgresql://postgres:Ppackkck-acm1pt@localhost:5432/mediconnect'
});

async function initDb() {
  try {
    // 1. Crear BD si no existe
    try {
      const checkDb = await adminPool.query(
        "SELECT datname FROM pg_database WHERE datname = $1",
        ['mediconnect']
      );
      
      if (checkDb.rows.length === 0) {
        console.log('Creando base de datos mediconnect...');
        await adminPool.query('CREATE DATABASE mediconnect WITH OWNER postgres ENCODING \'UTF8\';');
        console.log('✅ Base de datos creada');
      } else {
        console.log('✅ Base de datos ya existe');
      }
    } catch (err) {
      if (!err.message.includes('already exists')) {
        throw err;
      }
      console.log('✅ Base de datos ya existe');
    }

    // 2. Ejecutar scripts SQL
    const sqlDir = path.join(__dirname, '..', 'database');
    const sqlFiles = fs.readdirSync(sqlDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of sqlFiles) {
      console.log(`\nEjecutando ${file}...`);
      const sql = fs.readFileSync(path.join(sqlDir, file), 'utf8');
      try {
        await appPool.query(sql);
        console.log(`✅ ${file} completado`);
      } catch (err) {
        console.log(`⚠️ ${file}: ${err.message.split('\n')[0]}`);
      }
    }

    console.log('\n✅ Inicialización completada');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await adminPool.end();
    await appPool.end();
  }
}

initDb();
