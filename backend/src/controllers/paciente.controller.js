const pool = require('../db/pool');

/**
 * GET /api/paciente/dashboard
 * Devuelve la próxima cita del paciente y las últimas 5 notificaciones.
 * El id_usuario se extrae exclusivamente del token JWT (req.user.id)
 * para prevenir IDOR — nunca se acepta del cliente.
 */
async function getDashboard(req, res) {
  // parseInt asegura que el id sea un número antes de pasarlo a la query
  const idUsuario = parseInt(req.user.id, 10);

  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  try {
    // Próxima cita: la más próxima con estado pendiente o confirmada a partir de hoy
    const citaResult = await pool.query(
      `SELECT
         c.id_cita,
         c.fecha_cita,
         c.hora_cita,
         c.estado_cita,
         c.motivo_consulta,
         c.modalidad,
         u.nombre    AS medico_nombre,
         u.apellido  AS medico_apellido,
         e.nombre_especialidad
       FROM   citas_medicas    c
       JOIN   pacientes        p ON c.id_paciente     = p.id_paciente
       JOIN   medicos          m ON c.id_medico        = m.id_medico
       JOIN   usuarios         u ON m.id_usuario       = u.id_usuario
       JOIN   especialidades   e ON c.id_especialidad  = e.id_especialidad
       WHERE  p.id_usuario   = $1
         AND  c.estado_cita  IN ('pendiente', 'confirmada')
         AND  c.fecha_cita   >= CURRENT_DATE
       ORDER  BY c.fecha_cita ASC, c.hora_cita ASC
       LIMIT  1`,
      [idUsuario]
    );

    // Últimas 5 notificaciones del usuario autenticado
    const notifResult = await pool.query(
      `SELECT
         id_notificacion,
         titulo,
         mensaje,
         tipo,
         leida,
         fecha_envio
       FROM   notificaciones
       WHERE  id_usuario = $1
       ORDER  BY fecha_envio DESC
       LIMIT  5`,
      [idUsuario]
    );

    // Cantidad de notificaciones no leídas para el badge del header
    const unreadResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM   notificaciones
       WHERE  id_usuario = $1
         AND  leida = FALSE`,
      [idUsuario]
    );

    return res.json({
      proximaCita:    citaResult.rows[0] ?? null,
      notificaciones: notifResult.rows,
      noLeidas:       parseInt(unreadResult.rows[0].total, 10),
    });
  } catch (err) {
    console.error('Error en getDashboard paciente:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * GET /api/paciente/especialidades
 * Retorna especialidades activas + noLeidas del paciente autenticado para el header.
 * Se usa en la vista Reservar donde el paciente elige especialidad.
 */
async function getEspecialidadesConBadge(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  try {
    const [espResult, unreadResult] = await Promise.all([
      pool.query(
        `SELECT id_especialidad, nombre_especialidad, descripcion
         FROM   especialidades
         WHERE  estado = 'activa'
         ORDER  BY nombre_especialidad ASC`
      ),
      pool.query(
        `SELECT COUNT(*) AS total
         FROM   notificaciones
         WHERE  id_usuario = $1 AND leida = FALSE`,
        [idUsuario]
      ),
    ]);

    return res.json({
      especialidades: espResult.rows,
      noLeidas: parseInt(unreadResult.rows[0].total, 10),
    });
  } catch (err) {
    console.error('Error en getEspecialidadesConBadge:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

module.exports = { getDashboard, getEspecialidadesConBadge };
