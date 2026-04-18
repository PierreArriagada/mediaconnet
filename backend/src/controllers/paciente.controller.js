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
 * GET /api/paciente/profesionales/:idEspecialidad
 * Devuelve médicos activos de la especialidad con sus próximas 3 disponibilidades.
 * El id_usuario del token se usa exclusivamente para el conteo de noLeidas (anti-IDOR).
 */
async function getProfesionalesPorEspecialidad(req, res) {
  const idUsuario      = parseInt(req.user.id, 10);
  const idEspecialidad = parseInt(req.params.idEspecialidad, 10);

  if (isNaN(idUsuario) || isNaN(idEspecialidad) || idEspecialidad < 1) {
    return res.status(400).json({ message: 'Parámetros inválidos.' });
  }

  try {
    // Verificar especialidad activa
    const espResult = await pool.query(
      `SELECT id_especialidad, nombre_especialidad, descripcion
       FROM   especialidades
       WHERE  id_especialidad = $1 AND estado = 'activa'`,
      [idEspecialidad]
    );
    if (espResult.rowCount === 0) {
      return res.status(404).json({ message: 'Especialidad no encontrada.' });
    }

    // Médicos activos de la especialidad
    const medicosResult = await pool.query(
      `SELECT m.id_medico, u.nombre, u.apellido, m.anios_experiencia, m.numero_registro
       FROM   medicos  m
       JOIN   usuarios u ON m.id_usuario = u.id_usuario
       WHERE  m.id_especialidad = $1 AND m.estado = 'activo'
       ORDER  BY m.id_medico ASC`,
      [idEspecialidad]
    );

    const medicos = medicosResult.rows;
    let disponibilidades = [];

    if (medicos.length > 0) {
      const idsMedicos = medicos.map((m) => m.id_medico);
      // Máximo 3 slots futuros por médico usando ventana ROW_NUMBER
      const dispResult = await pool.query(
        `SELECT id_disponibilidad, id_medico,
                fecha::text, hora_inicio::text, hora_fin::text
         FROM (
           SELECT d.*,
                  ROW_NUMBER() OVER (
                    PARTITION BY d.id_medico
                    ORDER     BY d.fecha ASC, d.hora_inicio ASC
                  ) AS rn
           FROM disponibilidad_medica d
           WHERE d.id_medico  = ANY($1::int[])
             AND d.fecha      >= CURRENT_DATE
             AND d.estado     = 'disponible'
         ) sub
         WHERE rn <= 3`,
        [idsMedicos]
      );
      disponibilidades = dispResult.rows;
    }

    // Badge de notificaciones no leídas del usuario autenticado
    const unreadResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM   notificaciones
       WHERE  id_usuario = $1 AND leida = FALSE`,
      [idUsuario]
    );

    // Asociar disponibilidades a cada médico
    const medicosConDisp = medicos.map((m) => ({
      ...m,
      disponibilidad: disponibilidades.filter((d) => d.id_medico === m.id_medico),
    }));

    return res.json({
      especialidad: espResult.rows[0],
      medicos:      medicosConDisp,
      noLeidas:     parseInt(unreadResult.rows[0].total, 10),
    });
  } catch (err) {
    console.error('Error en getProfesionalesPorEspecialidad:', err);
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

module.exports = { getDashboard, getEspecialidadesConBadge, getProfesionalesPorEspecialidad };
