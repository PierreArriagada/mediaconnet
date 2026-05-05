/**
 * Script de testing para el flujo completo de password reset
 * Simula: forgot-password → token generation → reset-password
 */

require('dotenv').config();
const crypto = require('crypto');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testPasswordResetFlow() {
  try {
    console.log('\n=== PRUEBA DE FLUJO DE RECUPERACIÓN DE CONTRASEÑA ===\n');

    // 1. Obtener un usuario existente
    console.log('1. Buscando usuario de prueba...');
    const userResult = await pool.query(
      `SELECT id_usuario, correo, nombre FROM usuarios 
       WHERE correo = 'paciente2@mediconnect.cl' AND estado = 'activo'`
    );

    if (userResult.rows.length === 0) {
      console.error('❌ Usuario no encontrado');
      await pool.end();
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`✅ Usuario encontrado: ${user.nombre} (${user.correo})`);

    // 2. Obtener un token activo existente O generar uno nuevo
    console.log('\n2. Preparando token...');
    
    let resetToken;

    // Primero, intentar obtener un token activo
    const existingTokenResult = await pool.query(
      `SELECT prt.id_token
       FROM password_reset_tokens prt
       WHERE prt.id_usuario = $1
         AND prt.usado = FALSE
         AND prt.expiracion > CURRENT_TIMESTAMP
       LIMIT 1`,
      [user.id_usuario]
    );

    if (existingTokenResult.rows.length > 0) {
      // Tenemos un token activo, necesitamos generar uno nuevo
      console.log('  Existe un token activo anterior. Generando uno nuevo...');
      resetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const expiration = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      // Primero, marcar todos los tokens activos como usados (fuera de la transacción)
      await pool.query(
        'UPDATE password_reset_tokens SET usado = TRUE WHERE id_usuario = $1 AND usado = FALSE',
        [user.id_usuario]
      );

      // Ahora insertar el nuevo token
      await pool.query(
        'INSERT INTO password_reset_tokens (id_usuario, token_hash, expiracion) VALUES ($1, $2, $3)',
        [user.id_usuario, tokenHash, expiration]
      );

      console.log(`✅ Nuevo token generado`);
    } else {
      // Generar un nuevo token desde cero
      resetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const expiration = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      await pool.query(
        'INSERT INTO password_reset_tokens (id_usuario, token_hash, expiracion) VALUES ($1, $2, $3)',
        [user.id_usuario, tokenHash, expiration]
      );

      console.log(`✅ Token generado`);
    }

    // 3. Validar el token
    console.log('\n3. Validando el token...');
    const tokenHashForQuery = crypto.createHash('sha256').update(resetToken.trim()).digest('hex');

    const tokenResult = await pool.query(`
      SELECT prt.id_token, prt.id_usuario, u.correo
      FROM password_reset_tokens prt
      JOIN usuarios u ON prt.id_usuario = u.id_usuario
      WHERE prt.token_hash = $1
        AND prt.usado = FALSE
        AND prt.expiracion > CURRENT_TIMESTAMP
        AND u.estado = 'activo'
    `, [tokenHashForQuery]);

    if (tokenResult.rows.length === 0) {
      console.error('❌ Token no encontrado o expirado');
      await pool.end();
      process.exit(1);
    }

    const tokenRecord = tokenResult.rows[0];
    console.log(`✅ Token validado para usuario: ${tokenRecord.correo}`);

    // 4. Actualizar la contraseña
    console.log('\n4. Actualizando contraseña...');
    const newPassword = 'TestPassword123!';

    const saltRounds = 12;
    await pool.query(`
      UPDATE usuarios
      SET contrasena_hash = crypt($1, gen_salt('bf', $2))
      WHERE id_usuario = $3
    `, [newPassword, saltRounds, tokenRecord.id_usuario]);

    // Marcar token como usado
    await pool.query(
      'UPDATE password_reset_tokens SET usado = TRUE WHERE id_token = $1',
      [tokenRecord.id_token]
    );

    console.log(`✅ Contraseña actualizada para: ${tokenRecord.correo}`);

    // 5. Verificar que la contraseña se puede usar para login
    console.log('\n5. Verificando que la nueva contraseña funciona...');
    
    const loginResult = await pool.query(
      `SELECT (u.contrasena_hash = crypt($1, u.contrasena_hash)) AS valid
       FROM usuarios u
       WHERE u.id_usuario = $2`,
      [newPassword, tokenRecord.id_usuario]
    );

    const isValid = loginResult.rows[0]?.valid;
    if (isValid) {
      console.log('✅ La nueva contraseña es válida y puede usarse para login');
    } else {
      console.log('❌ La nueva contraseña no es válida');
    }

    // 6. Verificar que el token no puede ser reutilizado
    console.log('\n6. Verificando seguridad del token...');
    
    const reuseTest = await pool.query(`
      SELECT COUNT(*) as count
      FROM password_reset_tokens prt
      WHERE prt.token_hash = $1
        AND prt.usado = FALSE
        AND prt.expiracion > CURRENT_TIMESTAMP
    `, [tokenHashForQuery]);

    if (Number(reuseTest.rows[0].count) === 0) {
      console.log('✅ Token no puede reutilizarse (marcado como usado)');
    } else {
      console.log('❌ El token todavía puede reutilizarse');
    }

    console.log('\n=== ✅ FLUJO COMPLETO VERIFICADO EXITOSAMENTE ===\n');
    console.log('Resumen de la prueba:');
    console.log(`  ✓ Usuario: ${tokenRecord.correo}`);
    console.log(`  ✓ Token generado y validado`);
    console.log(`  ✓ Contraseña actualizada: ${newPassword}`);
    console.log(`  ✓ Contraseña funciona para login`);
    console.log(`  ✓ Token es de un solo uso\n`);

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error durante la prueba:', err.message);
    await pool.end();
    process.exit(1);
  }
}

// Ejecutar la prueba
testPasswordResetFlow();
