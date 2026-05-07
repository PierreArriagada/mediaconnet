const { validationResult } = require('express-validator');
const jwt  = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const pool = require('../db/pool');
const { JWT_SECRET, JWT_EXPIRES } = require('../config/jwt.config');
const { normalizeRut } = require('../utils/rut');

async function sendRecoveryEmailSandbox(to, resetLink) {
  const testAccount = await nodemailer.createTestAccount();

  const transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  const info = await transporter.sendMail({
    from: 'MediConnect <no-reply@mediconnect.local>',
    to,
    subject: 'Recuperación de contraseña - MediConnect',
    text: `Hola,\n\nRecibimos una solicitud para restablecer tu contraseña en MediConnect.\n\nIngresa al siguiente enlace para crear una nueva contraseña:\n${resetLink}\n\nEste enlace caducará en 24 horas.\n\nSi no solicitaste este cambio, puedes ignorar este mensaje.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #143047; line-height: 1.5;">
        <h2 style="color: #0f6fae;">Recuperación de contraseña - MediConnect</h2>
        <p>Hola,</p>
        <p>Recibimos una solicitud para restablecer tu contraseña en MediConnect.</p>
        <p>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 18px; background: #0f6fae; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Restablecer contraseña
          </a>
        </p>
        <p>Este enlace caducará en <strong>24 horas</strong>.</p>
        <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
      </div>
    `,
  });

  return nodemailer.getTestMessageUrl(info);
}

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

  const rutNormalizado = normalizeRut(rut);
  if (!rutNormalizado) {
    return res.status(400).json({ message: 'RUT inválido.' });
  }

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
      `SELECT 1
       FROM   pacientes
       WHERE  REPLACE(REPLACE(REPLACE(UPPER(rut), '.', ''), '-', ''), ' ', '') = REPLACE($1, '-', '')
         AND  id_usuario IS NOT NULL`,
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
        `SELECT id_paciente
         FROM   pacientes
         WHERE  REPLACE(REPLACE(REPLACE(UPPER(rut), '.', ''), '-', ''), ' ', '') = REPLACE($1, '-', '')
           AND  id_usuario IS NULL
         ORDER  BY id_paciente ASC
         LIMIT  1`,
        [rutNormalizado]
      );

      if (pacienteInvitado.rowCount > 0) {
        const idPacienteVinculado = pacienteInvitado.rows[0].id_paciente;
        // Vincular el registro existente del invitado con la nueva cuenta
        await client.query(
          'UPDATE pacientes SET id_usuario = $1, rut = $2, fecha_actualizacion = NOW() WHERE id_paciente = $3',
          [idUsuario, rutNormalizado, idPacienteVinculado]
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

/** Recuperación de contraseña (modo sandbox/desarrollo) */
async function forgotPassword(req, res) {
  const { email } = req.body;

  try {
    const userResult = await pool.query(
      `SELECT id_usuario, correo
       FROM usuarios
       WHERE correo = $1
         AND estado = 'activo'`,
      [email]
    );

    // Anti-enumeración: siempre responder lo mismo
    if (userResult.rowCount === 0) {
      return res.status(200).json({
        message: 'Si el correo está registrado, recibirás las instrucciones en breve.',
      });
    }

    const user = userResult.rows[0];

    // Token aleatorio seguro
    const token = crypto.randomBytes(32).toString('hex');

    // Expiración: 24 horas
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Limpiar tokens anteriores del usuario
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE id_usuario = $1',
      [user.id_usuario]
    );

    // Guardar nuevo token
    await pool.query(
      `INSERT INTO password_reset_tokens (id_usuario, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id_usuario, token, expiresAt]
    );

    const resetLink = `http://localhost:8100/auth/reset-password?token=${token}`;

    let etherealPreviewUrl = null;

    try {
      etherealPreviewUrl = await sendRecoveryEmailSandbox(user.correo, resetLink);
    } catch (mailErr) {
      console.error('Error enviando correo sandbox con Ethereal:', mailErr);
    }

    // Sandbox/desarrollo: mantener trazabilidad visible para demo
    console.log('\n[RECOVERY SANDBOX] ==============================');
    console.log(`Usuario: ${user.correo}`);
    console.log(`Link recuperación: ${resetLink}`);
    if (etherealPreviewUrl) {
      console.log(`Vista previa Ethereal: ${etherealPreviewUrl}`);
    }
    console.log('================================================\n');

    return res.status(200).json({
      message: 'Si el correo está registrado, recibirás las instrucciones en breve.',
      sandbox_reset_link: resetLink,
      ethereal_preview_url: etherealPreviewUrl,
    });
  } catch (err) {
    console.error('Error en forgotPassword:', err);

    // Mantener respuesta genérica por seguridad
    return res.status(200).json({
      message: 'Si el correo está registrado, recibirás las instrucciones en breve.',
    });
  }
}

/** Restablecimiento de contraseña mediante token */
async function resetPassword(req, res) {
  const { token, password } = req.body;

  if (!token || !password || password.length < 8) {
    return res.status(400).json({
      message: 'Datos inválidos para restablecer la contraseña.',
    });
  }

  try {
    const tokenResult = await pool.query(
      `SELECT id, id_usuario, expires_at
       FROM password_reset_tokens
       WHERE token = $1`,
      [token]
    );

    if (tokenResult.rowCount === 0) {
      return res.status(400).json({
        message: 'El enlace de recuperación no es válido.',
      });
    }

    const resetToken = tokenResult.rows[0];

    // Validar expiración
    if (new Date(resetToken.expires_at) < new Date()) {
      await pool.query(
        'DELETE FROM password_reset_tokens WHERE id = $1',
        [resetToken.id]
      );

      return res.status(400).json({
        message: 'El enlace de recuperación ha expirado.',
      });
    }

    // Actualizar contraseña usando pgcrypto
    await pool.query(
      `UPDATE usuarios
       SET contrasena_hash = crypt($1, gen_salt('bf', 12))
       WHERE id_usuario = $2`,
      [password, resetToken.id_usuario]
    );

    // Invalidar token después del uso
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE id = $1',
      [resetToken.id]
    );

    return res.status(200).json({
      message: 'Contraseña actualizada correctamente.',
    });
  } catch (err) {
    console.error('Error en resetPassword:', err);
    return res.status(500).json({
      message: 'Error interno del servidor.',
    });
  }
}

module.exports = { login, register, forgotPassword, resetPassword };
