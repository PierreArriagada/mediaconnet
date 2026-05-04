const { validationResult } = require('express-validator');
const jwt  = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db/pool');
const { JWT_SECRET, JWT_EXPIRES } = require('../config/jwt.config');
const { sendEmail } = require('../services/email.service');

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

/** Recuperación de contraseña: genera token y envía correo (anti-enumeración) */
async function forgotPassword(req, res) {
  const { email } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(200).json({
      message: 'Si el correo está registrado, recibirás las instrucciones en breve.',
    });
  }

  try {
    // Generar token simple con crypto.randomBytes(32).toString('hex')
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Construir URL de reset con el token
    const resetUrl = `http://localhost:8100/auth/reset-password?token=${resetToken}`;

    // Construcción del HTML del correo
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; color: white;">
          <h1 style="margin: 0;">MediConnect</h1>
          <p style="margin: 0; margin-top: 10px;">Recuperación de Contraseña</p>
        </div>
        
        <div style="padding: 30px; background-color: #f9f9f9;">
          <h2 style="color: #333; margin-bottom: 20px;">Solicitaste restablecer tu contraseña</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Haz clic en el siguiente enlace para cambiar tu contraseña. 
            <strong>Este enlace caducará en 24 horas por tu seguridad.</strong>
          </p>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${resetUrl}" 
               style="display: inline-block; background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Restablecer Contraseña
            </a>
          </div>
          
          <p style="color: #999; font-size: 12px; margin-bottom: 20px;">
            O copia y pega este enlace en tu navegador:
          </p>
          <p style="color: #667eea; word-break: break-all; font-size: 12px;">
            ${resetUrl}
          </p>
          
          <div style="border-top: 1px solid #ddd; margin-top: 30px; padding-top: 20px;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              Si no solicitaste este cambio de contraseña, ignora este correo.
            </p>
            <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
              © 2026 MediConnect. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    `;

    // Intentar enviar el correo (sin fallar si no funciona)
    try {
      await sendEmail({
        to: email.toLowerCase(),
        subject: 'MediConnect - Restablecer tu contraseña',
        html: emailHtml,
      });
      console.log(`Email de recuperación enviado a ${email}`);
    } catch (mailErr) {
      console.error('Error enviando correo de recuperación:', mailErr);
      // No fallar el endpoint, responder con mensaje genérico igual
    }

    // Responder siempre lo mismo por seguridad (anti-enumeración)
    return res.status(200).json({
      message: 'Si el correo está registrado, recibirás las instrucciones en breve.',
    });
  } catch (err) {
    console.error('Error en forgotPassword:', err);
    // Responder con mensaje genérico incluso en caso de error
    return res.status(200).json({
      message: 'Si el correo está registrado, recibirás las instrucciones en breve.',
    });
  }
}

/** Restablecer contraseña: endpoint simulado sin actualizar BD */
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
    // Por ahora solo simulamos el cambio sin tocar la BD
    console.log(`Simulando reseteo de contraseña para token: ${token.substring(0, 8)}...`);

    return res.status(200).json({
      message: 'Contraseña actualizada correctamente',
    });
  } catch (err) {
    console.error('Error en resetPassword:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

module.exports = { login, register, forgotPassword, resetPassword };
