const { validationResult } = require('express-validator');
const jwt  = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../db/pool');
const { JWT_SECRET, JWT_EXPIRES } = require('../config/jwt.config');
const { sendPasswordResetEmail } = require('../services/email.service');

/** Inicio de sesión: verifica credenciales contra la BD real usando pgcrypto */
async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Datos inválidos' });
  }

  const { email, password } = req.body;

  try {
    // pgcrypto: crypt($2, contrasena_hash) rehashea la contraseña ingresada
    // con la sal almacenada y compara. Si coincide, 'valid' es true.
    const result = await pool.query(
      `SELECT u.id_usuario,
              u.nombre,
              u.apellido,
              u.correo,
              r.nombre_rol,
              (u.contrasena_hash = crypt($2, u.contrasena_hash)) AS valid
       FROM   usuarios u
       JOIN   roles r ON u.id_rol = r.id_rol
       WHERE  u.correo = $1
         AND  u.estado = 'activo'`,
      [email, password]
    );

    const user = result.rows[0];

    // Mismo mensaje para correo no encontrado y contraseña incorrecta (anti-enumeración)
    if (!user || !user.valid) {
      return res.status(401).json({
        message: 'Credenciales incorrectas. Verifica tu correo y contraseña.',
      });
    }

    const payload = {
      id:    String(user.id_usuario),
      email: user.correo,
      name:  `${user.nombre} ${user.apellido}`,
      role:  user.nombre_rol, // 'Paciente' | 'Medico' | 'Administrador'
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    return res.json({ token, user: payload });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

/** Registro: crea usuario con rol Paciente (id_rol = 2 según 01_init.sql) */
async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Datos inválidos' });
  }

  const { nombre, apellido, correo, password, telefono, rut } = req.body;

  // RUT es requerido para poder vincular solicitudes de invitado y como identificador único
  if (!rut || typeof rut !== 'string' || rut.trim().length < 8) {
    return res.status(400).json({ message: 'RUT requerido.' });
  }
  const rutNormalizado = rut.trim().toUpperCase();

  try {
    const existing = await pool.query(
      'SELECT 1 FROM usuarios WHERE correo = $1',
      [correo]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({
        message: 'Este correo ya está registrado. Intenta iniciar sesión.',
      });
    }

    // Verificar que el RUT no esté ya vinculado a otra cuenta
    const rutConCuenta = await pool.query(
      'SELECT 1 FROM pacientes WHERE rut = $1 AND id_usuario IS NOT NULL',
      [rutNormalizado]
    );
    if (rutConCuenta.rowCount > 0) {
      return res.status(409).json({
        message: 'Este RUT ya está vinculado a una cuenta existente.',
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // crypt($4, gen_salt('bf', 12)): hashea con bcrypt (blowfish, 12 rondas)
      const userResult = await client.query(
        `INSERT INTO usuarios (nombre, apellido, correo, contrasena_hash, telefono, estado, id_rol)
         VALUES ($1, $2, $3, crypt($4, gen_salt('bf', 12)), $5, 'activo', 2)
         RETURNING id_usuario`,
        [nombre, apellido, correo, password, telefono ?? null]
      );

      const idUsuario = userResult.rows[0].id_usuario;

      // Verificar si existe un paciente invitado con este RUT (id_usuario IS NULL)
      // para vincularlo en lugar de crear un registro duplicado
      const pacienteInvitado = await client.query(
        'SELECT id_paciente FROM pacientes WHERE rut = $1 AND id_usuario IS NULL',
        [rutNormalizado]
      );

      if (pacienteInvitado.rowCount > 0) {
        const idPacienteVinculado = pacienteInvitado.rows[0].id_paciente;
        // Vincular el registro existente del invitado con la nueva cuenta
        await client.query(
          'UPDATE pacientes SET id_usuario = $1, fecha_actualizacion = NOW() WHERE id_paciente = $2',
          [idUsuario, idPacienteVinculado]
        );
        // Las citas creadas como invitado ahora pertenecen a un usuario registrado.
        // Limpiar es_invitado para que los badges muestren el estado real (no "En revisión").
        await client.query(
          'UPDATE citas_medicas SET es_invitado = FALSE, fecha_actualizacion = NOW() WHERE id_paciente = $1',
          [idPacienteVinculado]
        );
      } else {
        // No existe registro previo: crear nuevo paciente con RUT real
        await client.query(
          `INSERT INTO pacientes (id_usuario, rut, fecha_nacimiento)
           VALUES ($1, $2, '2000-01-01')`,
          [idUsuario, rutNormalizado]
        );
      }

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    return res.status(201).json({ message: 'Cuenta creada exitosamente.' });
  } catch (err) {
    console.error('Error en register:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

/** Recuperación de contraseña: envía email con token si el usuario existe */
async function forgotPassword(req, res) {
  const { email } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ message: 'Correo electrónico inválido' });
  }

  try {
    const correoNormalizado = email.toLowerCase().trim();

    // Buscar el usuario activo en la base de datos
    const userResult = await pool.query(
      'SELECT id_usuario, nombre FROM usuarios WHERE correo = $1 AND estado = $2',
      [correoNormalizado, 'activo']
    );

    const user = userResult.rows[0];

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const expiration = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          'UPDATE password_reset_tokens SET usado = TRUE WHERE id_usuario = $1 AND usado = FALSE',
          [user.id_usuario]
        );
        await client.query(
          'INSERT INTO password_reset_tokens (id_usuario, token_hash, expiracion) VALUES ($1, $2, $3)',
          [user.id_usuario, tokenHash, expiration]
        );
        await client.query('COMMIT');
      } catch (dbError) {
        await client.query('ROLLBACK');
        throw dbError;
      } finally {
        client.release();
      }

      try {
        await sendPasswordResetEmail(correoNormalizado, resetToken);
        console.log(`Email de recuperación enviado a: ${correoNormalizado}`);
      } catch (emailError) {
        console.error('Error enviando email de recuperación:', emailError);
      }
    }

    return res.status(200).json({
      message: 'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.',
    });
  } catch (err) {
    console.error('Error en forgotPassword:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

/** Restablecer contraseña: valida token y actualiza contraseña */
async function resetPassword(req, res) {
  const { token, newPassword, confirmPassword } = req.body;

  // Validaciones básicas
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return res.status(400).json({ message: 'Token inválido o expirado' });
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Las contraseñas no coinciden' });
  }

  try {
    // Generar hash del token para comparación
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    // Buscar token válido (no usado y no expirado)
    const tokenResult = await pool.query(`
      SELECT prt.id_token, prt.id_usuario, u.correo
      FROM password_reset_tokens prt
      JOIN usuarios u ON prt.id_usuario = u.id_usuario
      WHERE prt.token_hash = $1
        AND prt.usado = FALSE
        AND prt.expiracion > CURRENT_TIMESTAMP
        AND u.estado = 'activo'
    `, [tokenHash]);

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ message: 'Token inválido o expirado' });
    }

    const { id_token, id_usuario, correo } = tokenResult.rows[0];

    const saltRounds = 12;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(`
        UPDATE usuarios
        SET contrasena_hash = crypt($1, gen_salt('bf', $2))
        WHERE id_usuario = $3
      `, [newPassword, saltRounds, id_usuario]);

      await client.query(
        'UPDATE password_reset_tokens SET usado = TRUE WHERE id_token = $1',
        [id_token]
      );

      await client.query('COMMIT');
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

    console.log(`Contraseña actualizada para usuario: ${correo}`);

    return res.status(200).json({
      message: 'Contraseña actualizada correctamente',
    });

  } catch (err) {
    console.error('Error en resetPassword:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

async function changePassword(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Datos inválidos', errors: errors.array() });
  }

  const { userId, currentPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Las contraseñas no coinciden' });
  }

  try {
    const result = await pool.query(
      'SELECT contrasena_hash FROM usuarios WHERE id_usuario = $1',
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const storedHash = result.rows[0].contrasena_hash;
    let currentPasswordValid = false;

    if (typeof storedHash === 'string' && /^\$2[aby]\$/.test(storedHash)) {
      currentPasswordValid = await bcrypt.compare(currentPassword, storedHash);
    } else {
      const verifyResult = await pool.query(
        `SELECT (contrasena_hash = crypt($2, contrasena_hash)) AS valid
         FROM usuarios
         WHERE id_usuario = $1`,
        [userId, currentPassword]
      );
      currentPasswordValid = verifyResult.rows[0]?.valid === true;

      if (!currentPasswordValid && currentPassword === storedHash) {
        currentPasswordValid = true;
      }
    }

    if (!currentPasswordValid) {
      return res.status(401).json({ message: 'La contraseña actual es incorrecta' });
    }

    await pool.query(
      `UPDATE usuarios
       SET contrasena_hash = crypt($2, gen_salt('bf', 12))
       WHERE id_usuario = $1`,
      [userId, newPassword]
    );

    return res.status(200).json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('Error en changePassword:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

module.exports = { login, register, forgotPassword, resetPassword, changePassword };
