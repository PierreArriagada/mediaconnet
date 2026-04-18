const { validationResult } = require('express-validator');
const jwt  = require('jsonwebtoken');
const pool = require('../db/pool');
const { JWT_SECRET, JWT_EXPIRES } = require('../config/jwt.config');

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

  const { nombre, apellido, correo, password, telefono } = req.body;
  // El campo rut se completará al crear el perfil de paciente (requiere fecha_nacimiento)

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

    // Transacción: crea usuario + perfil de paciente juntos
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
      // rut provisional único hasta que el paciente complete su perfil
      const rutTemp = `USR-${idUsuario}`;

      await client.query(
        `INSERT INTO pacientes (id_usuario, rut, fecha_nacimiento)
         VALUES ($1, $2, '2000-01-01')`,
        [idUsuario, rutTemp]
      );

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

/** Recuperación de contraseña: siempre responde 200 (anti-enumeración) */
async function forgotPassword(_req, res) {
  return res.status(200).json({
    message: 'Si el correo está registrado, recibirás las instrucciones en breve.',
  });
}

module.exports = { login, register, forgotPassword };
