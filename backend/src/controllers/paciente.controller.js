const pool = require('../db/pool');
const { parsePagination } = require('../utils/pagination');

async function contarNotificacionesNoLeidas(idUsuario) {
  const result = await pool.query(
    `SELECT COUNT(*) AS total
     FROM   notificaciones
     WHERE  id_usuario = $1
       AND  leida = FALSE`,
    [idUsuario]
  );

  return parseInt(result.rows[0].total, 10);
}

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
    // Próxima cita: la más próxima con estado pendiente o confirmada a partir de ahora
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
         AND  (c.fecha_cita + c.hora_cita) >= NOW()
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
    const noLeidas = await contarNotificacionesNoLeidas(idUsuario);

    // Cita que requiere confirmación de asistencia:
    // confirmada + dentro de las próximas 24h + aún no confirmó asistencia
    const confirmResult = await pool.query(
      `SELECT
         c.id_cita,
         c.fecha_cita,
         c.hora_cita,
         c.modalidad,
         u.nombre    AS medico_nombre,
         u.apellido  AS medico_apellido,
         e.nombre_especialidad
       FROM   citas_medicas    c
       JOIN   pacientes        p ON c.id_paciente     = p.id_paciente
       JOIN   medicos          m ON c.id_medico        = m.id_medico
       JOIN   usuarios         u ON m.id_usuario       = u.id_usuario
       JOIN   especialidades   e ON c.id_especialidad  = e.id_especialidad
       WHERE  p.id_usuario            = $1
         AND  c.estado_cita           = 'confirmada'
         AND  c.confirmada_asistencia IS NOT TRUE
         AND  (c.fecha_cita + c.hora_cita) BETWEEN NOW() AND (NOW() + INTERVAL '24 hours')
       ORDER  BY c.fecha_cita ASC, c.hora_cita ASC
       LIMIT  1`,
      [idUsuario]
    );

    return res.json({
      proximaCita:              citaResult.rows[0] ?? null,
      citaPendienteConfirmacion: confirmResult.rows[0] ?? null,
      notificaciones:           notifResult.rows,
      noLeidas,
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

    // Médicos activos de la especialidad y disponibles laboralmente
    const medicosResult = await pool.query(
      `SELECT m.id_medico, u.nombre, u.apellido, m.anios_experiencia, m.numero_registro
       FROM   medicos  m
       JOIN   usuarios u ON m.id_usuario = u.id_usuario
       WHERE  m.id_especialidad = $1
         AND  m.estado = 'activo'
         AND  m.estado_laboral = 'activo'
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
             AND (
               d.fecha > CURRENT_DATE
               OR (d.fecha = CURRENT_DATE AND d.hora_inicio > CURRENT_TIME)
             )
             AND d.estado     = 'disponible'
         ) sub
         WHERE rn <= 3`,
        [idsMedicos]
      );
      disponibilidades = dispResult.rows;
    }

    // Badge de notificaciones no leídas del usuario autenticado
    const noLeidas = await contarNotificacionesNoLeidas(idUsuario);

    // Asociar disponibilidades a cada médico
    const medicosConDisp = medicos.map((m) => ({
      ...m,
      disponibilidad: disponibilidades.filter((d) => d.id_medico === m.id_medico),
    }));

    return res.json({
      especialidad: espResult.rows[0],
      medicos:      medicosConDisp,
      noLeidas,
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
    const [espResult, noLeidas] = await Promise.all([
      pool.query(
        `SELECT id_especialidad, nombre_especialidad, descripcion
         FROM   especialidades
         WHERE  estado = 'activa'
         ORDER  BY nombre_especialidad ASC`
      ),
      contarNotificacionesNoLeidas(idUsuario),
    ]);

    return res.json({
      especialidades: espResult.rows,
      noLeidas,
    });
  } catch (err) {
    console.error('Error en getEspecialidadesConBadge:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * GET /api/paciente/medico/:idMedico
 * Perfil enriquecido del médico: bio, valoraciones, horario de atención semanal,
 * próximo slot disponible y total de consultas realizadas.
 */
async function getDetalleMedico(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  const idMedico  = parseInt(req.params.idMedico, 10);

  if (isNaN(idUsuario) || isNaN(idMedico) || idMedico < 1) {
    return res.status(400).json({ message: 'Parámetros inválidos.' });
  }

  try {
    const medicoResult = await pool.query(
      `SELECT m.id_medico, u.nombre, u.apellido, m.anios_experiencia, m.numero_registro,
              m.biografia, m.valoracion_promedio, m.total_valoraciones,
              e.id_especialidad, e.nombre_especialidad, e.descripcion AS descripcion_especialidad
       FROM   medicos m
       JOIN   usuarios u ON m.id_usuario = u.id_usuario
       JOIN   especialidades e ON m.id_especialidad = e.id_especialidad
       WHERE  m.id_medico = $1
         AND  m.estado = 'activo'
         AND  m.estado_laboral = 'activo'`,
      [idMedico]
    );

    if (medicoResult.rowCount === 0) {
      return res.status(404).json({ message: 'Médico no encontrado.' });
    }

    // Horario de atención semanal (días y rango de horas por día)
    const scheduleResult = await pool.query(
      `SELECT
         EXTRACT(ISODOW FROM fecha)::int AS dia_semana,
         MIN(hora_inicio::text) AS hora_inicio,
         MAX(hora_fin::text) AS hora_fin
       FROM   disponibilidad_medica
       WHERE  id_medico = $1
         AND  (
           fecha > CURRENT_DATE
           OR (fecha = CURRENT_DATE AND hora_inicio > CURRENT_TIME)
         )
         AND  estado IN ('disponible', 'reservada')
       GROUP  BY EXTRACT(ISODOW FROM fecha)
       ORDER  BY dia_semana`,
      [idMedico]
    );

    // Próximo slot disponible
    const nextSlotResult = await pool.query(
      `SELECT fecha::text, hora_inicio::text, hora_fin::text
       FROM   disponibilidad_medica
       WHERE  id_medico = $1
         AND  (
           fecha > CURRENT_DATE
           OR (fecha = CURRENT_DATE AND hora_inicio > CURRENT_TIME)
         )
         AND  estado = 'disponible'
       ORDER  BY fecha ASC, hora_inicio ASC
       LIMIT  1`,
      [idMedico]
    );

    // Total de consultas realizadas por este médico
    const consultasResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM   citas_medicas
       WHERE  id_medico = $1 AND estado_cita IN ('completada', 'confirmada')`,
      [idMedico]
    );

    const noLeidas = await contarNotificacionesNoLeidas(idUsuario);

    return res.json({
      medico:          medicoResult.rows[0],
      horarioAtencion: scheduleResult.rows,
      proximoSlot:     nextSlotResult.rows[0] ?? null,
      totalConsultas:  parseInt(consultasResult.rows[0].total, 10),
      noLeidas,
    });
  } catch (err) {
    console.error('Error en getDetalleMedico:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * GET /api/paciente/medico/:idMedico/disponibilidad
 * Disponibilidad completa de un médico agrupada por fecha para la vista de calendario.
 */
async function getDisponibilidadMedico(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  const idMedico  = parseInt(req.params.idMedico, 10);

  if (isNaN(idUsuario) || isNaN(idMedico) || idMedico < 1) {
    return res.status(400).json({ message: 'Parámetros inválidos.' });
  }

  try {
    // Info básica del médico para el resumen
    const medicoResult = await pool.query(
      `SELECT m.id_medico, u.nombre, u.apellido,
              e.id_especialidad, e.nombre_especialidad
       FROM   medicos m
       JOIN   usuarios u ON m.id_usuario = u.id_usuario
       JOIN   especialidades e ON m.id_especialidad = e.id_especialidad
       WHERE  m.id_medico = $1
         AND  m.estado = 'activo'
         AND  m.estado_laboral = 'activo'`,
      [idMedico]
    );

    if (medicoResult.rowCount === 0) {
      return res.status(404).json({ message: 'Médico no encontrado.' });
    }

    // Todos los slots disponibles futuros
    const dispResult = await pool.query(
      `SELECT id_disponibilidad, fecha::text, hora_inicio::text, hora_fin::text
       FROM   disponibilidad_medica
       WHERE  id_medico = $1
         AND  (
           fecha > CURRENT_DATE
           OR (fecha = CURRENT_DATE AND hora_inicio > CURRENT_TIME)
         )
         AND  estado = 'disponible'
       ORDER  BY fecha ASC, hora_inicio ASC`,
      [idMedico]
    );

    const noLeidas = await contarNotificacionesNoLeidas(idUsuario);

    return res.json({
      medico:         medicoResult.rows[0],
      disponibilidad: dispResult.rows,
      noLeidas,
    });
  } catch (err) {
    console.error('Error en getDisponibilidadMedico:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * POST /api/paciente/reservar
 * Crea una cita médica para el paciente autenticado.
 * Valida que el slot de disponibilidad esté libre y lo marca como reservado dentro de una transacción.
 */
async function crearCitaPaciente(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  const { id_medico, id_especialidad, id_disponibilidad, modalidad, motivo_consulta } = req.body;

  // Validación básica de campos requeridos
  const idMedico  = parseInt(id_medico, 10);
  const idEsp     = parseInt(id_especialidad, 10);
  const idDisp    = parseInt(id_disponibilidad, 10);

  if (isNaN(idMedico) || isNaN(idEsp) || isNaN(idDisp)) {
    return res.status(400).json({ message: 'Parámetros numéricos inválidos.' });
  }
  if (!['presencial', 'telemedicina'].includes(modalidad)) {
    return res.status(400).json({ message: 'Modalidad inválida.' });
  }
  if (!motivo_consulta || typeof motivo_consulta !== 'string' || motivo_consulta.trim().length < 3 || motivo_consulta.length > 255) {
    return res.status(400).json({ message: 'Motivo de consulta inválido.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Obtener paciente del usuario autenticado
    const pacResult = await client.query(
      'SELECT id_paciente FROM pacientes WHERE id_usuario = $1',
      [idUsuario]
    );
    if (pacResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Paciente no encontrado.' });
    }
    const idPaciente = pacResult.rows[0].id_paciente;

    // Bloquear fila de disponibilidad para evitar doble reserva (race condition)
    const dispResult = await client.query(
      `SELECT d.id_disponibilidad, d.fecha::text, d.hora_inicio::text, m.id_especialidad, m.id_usuario AS id_usuario_medico
       FROM   disponibilidad_medica d
       JOIN   medicos m ON d.id_medico = m.id_medico
       WHERE  d.id_disponibilidad = $1
         AND  d.id_medico = $2
         AND  d.estado = 'disponible'
         AND  m.estado = 'activo'
         AND  m.estado_laboral = 'activo'
         AND  (
           d.fecha > CURRENT_DATE
           OR (d.fecha = CURRENT_DATE AND d.hora_inicio > CURRENT_TIME)
         )
       FOR UPDATE OF d`,
      [idDisp, idMedico]
    );

    if (dispResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'El horario seleccionado ya no está disponible.' });
    }

    const slot = dispResult.rows[0];
    if (Number(slot.id_especialidad) !== idEsp) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'La especialidad no corresponde al médico seleccionado.' });
    }

    // Marcar slot como reservado
    await client.query(
      `UPDATE disponibilidad_medica SET estado = 'reservada' WHERE id_disponibilidad = $1`,
      [idDisp]
    );

    // Crear cita médica — nace como 'confirmada' porque el slot ya fue bloqueado
    const citaResult = await client.query(
      `INSERT INTO citas_medicas (
         id_paciente, id_medico, id_especialidad, id_disponibilidad,
         modalidad, fecha_cita, hora_cita, estado_cita, motivo_consulta,
         es_invitado
       ) VALUES ($1, $2, $3, $4, $5, $6::date, $7::time, 'confirmada', $8, FALSE)
       RETURNING id_cita`,
      [idPaciente, idMedico, slot.id_especialidad, idDisp, modalidad.trim(), slot.fecha, slot.hora_inicio, motivo_consulta.trim()]
    );

    // Crear notificación de confirmación para el paciente
    await client.query(
      `INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
       VALUES ($1, 'Cita reservada', 'Tu cita médica fue registrada correctamente.', 'confirmacion', FALSE)`,
      [idUsuario]
    );

    // Crear notificación para el médico
    await client.query(
      `INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
       VALUES ($1, 'Nueva reserva de cita', 'Un paciente ha reservado la cita #' || $2 || ' en tu agenda.', 'confirmacion', FALSE)`,
      [slot.id_usuario_medico, citaResult.rows[0].id_cita]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Cita reservada correctamente.',
      id_cita: citaResult.rows[0].id_cita,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en crearCitaPaciente:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  } finally {
    client.release();
  }
}

/**
 * GET /api/paciente/cita/:idCita
 * Detalle completo de una cita médica del paciente autenticado.
 * Incluye datos del médico, especialidad, disponibilidad y estado.
 */
async function getDetalleCita(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  const idCita    = parseInt(req.params.idCita, 10);

  if (isNaN(idUsuario) || isNaN(idCita) || idCita < 1) {
    return res.status(400).json({ message: 'Parámetros inválidos.' });
  }

  try {
    // Prevención IDOR: se verifica que la cita pertenezca al paciente del usuario autenticado
    const citaResult = await pool.query(
      `SELECT
         c.id_cita, c.fecha_cita::text, c.hora_cita::text,
         c.estado_cita, c.motivo_consulta, c.modalidad, c.observaciones,
         c.fecha_creacion, c.fecha_actualizacion,
         c.id_disponibilidad, c.id_medico, c.id_especialidad, c.es_invitado, c.asistio_cita,
         m.id_medico, m.anios_experiencia, m.biografia,
         m.valoracion_promedio, m.total_valoraciones,
         u.nombre AS medico_nombre, u.apellido AS medico_apellido,
         e.nombre_especialidad, e.descripcion AS descripcion_especialidad,
         d.fecha::text AS disp_fecha, d.hora_inicio::text AS disp_hora_inicio,
         d.hora_fin::text AS disp_hora_fin
       FROM   citas_medicas    c
       JOIN   pacientes        p ON c.id_paciente     = p.id_paciente
       JOIN   medicos          m ON c.id_medico        = m.id_medico
       JOIN   usuarios         u ON m.id_usuario       = u.id_usuario
       JOIN   especialidades   e ON c.id_especialidad  = e.id_especialidad
       LEFT JOIN disponibilidad_medica d ON c.id_disponibilidad = d.id_disponibilidad
       WHERE  c.id_cita      = $1
         AND  p.id_usuario   = $2`,
      [idCita, idUsuario]
    );

    if (citaResult.rowCount === 0) {
      return res.status(404).json({ message: 'Cita no encontrada.' });
    }

    const noLeidas = await contarNotificacionesNoLeidas(idUsuario);

    return res.json({
      cita:     citaResult.rows[0],
      noLeidas,
    });
  } catch (err) {
    console.error('Error en getDetalleCita:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * PATCH /api/paciente/cita/:idCita/cancelar
 * Cancela una cita pendiente o confirmada del paciente autenticado.
 * Libera el slot de disponibilidad dentro de una transacción.
 */
async function cancelarCita(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  const idCita    = parseInt(req.params.idCita, 10);

  if (isNaN(idUsuario) || isNaN(idCita) || idCita < 1) {
    return res.status(400).json({ message: 'Parámetros inválidos.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar propiedad y estado cancelable (solo pendiente o confirmada)
    const citaResult = await client.query(
      `SELECT c.id_cita, c.id_disponibilidad, c.estado_cita, c.fecha_cita, c.hora_cita,
              (c.fecha_cita + c.hora_cita) > NOW() AS es_futura,
              m.id_usuario AS id_usuario_medico,
              up.nombre AS paciente_nombre, up.apellido AS paciente_apellido
       FROM   citas_medicas c
       JOIN   pacientes     p  ON c.id_paciente = p.id_paciente
       JOIN   usuarios      up ON p.id_usuario  = up.id_usuario
       JOIN   medicos       m  ON c.id_medico   = m.id_medico
       WHERE  c.id_cita    = $1
         AND  p.id_usuario = $2
       FOR UPDATE OF c`,
      [idCita, idUsuario]
    );

    if (citaResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Cita no encontrada.' });
    }

    const cita = citaResult.rows[0];

    if (!['pendiente', 'confirmada'].includes(cita.estado_cita)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Solo se pueden cancelar citas pendientes o confirmadas.' });
    }

    if (!cita.es_futura) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'No se puede cancelar una cita que ya ocurrió.' });
    }

    // Cancelar la cita
    await client.query(
      `UPDATE citas_medicas SET estado_cita = 'cancelada' WHERE id_cita = $1`,
      [idCita]
    );

    // Liberar slot de disponibilidad si existe
    if (cita.id_disponibilidad) {
      await client.query(
        `UPDATE disponibilidad_medica SET estado = 'disponible' WHERE id_disponibilidad = $1`,
        [cita.id_disponibilidad]
      );
    }

    // Notificación de cancelación al paciente
    await client.query(
      `INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
       VALUES ($1, 'Cita cancelada', 'Tu cita médica fue cancelada correctamente.', 'cancelacion', FALSE)`,
      [idUsuario]
    );

    // Notificar al médico que el paciente canceló
    await client.query(
      `INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
       VALUES ($1, 'Cita cancelada por paciente',
               $2 || ' ' || $3 || ' ha cancelado su cita del ' ||
               to_char($4::date, 'DD/MM/YYYY') || ' a las ' || to_char($5::time, 'HH24:MI') || '.',
               'cancelacion', FALSE)`,
      [cita.id_usuario_medico,
       cita.paciente_nombre, cita.paciente_apellido,
       cita.fecha_cita, cita.hora_cita]
    );

    await client.query('COMMIT');
    return res.json({ message: 'Cita cancelada correctamente.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en cancelarCita:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  } finally {
    client.release();
  }
}

/**
 * PATCH /api/paciente/cita/:idCita/reagendar
 * Reprograma una cita: libera el slot anterior y asigna uno nuevo.
 * Requiere { id_disponibilidad } en el body con el nuevo slot.
 */
async function reagendarCita(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  const idCita    = parseInt(req.params.idCita, 10);
  const nuevoIdDisp = parseInt(req.body.id_disponibilidad, 10);

  if (isNaN(idUsuario) || isNaN(idCita) || idCita < 1 || isNaN(nuevoIdDisp) || nuevoIdDisp < 1) {
    return res.status(400).json({ message: 'Parámetros inválidos.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar propiedad y estado reagendable
    const citaResult = await client.query(
      `SELECT c.id_cita, c.id_disponibilidad, c.estado_cita, c.id_medico
       FROM   citas_medicas c
       JOIN   pacientes     p ON c.id_paciente = p.id_paciente
       WHERE  c.id_cita    = $1
         AND  p.id_usuario = $2
       FOR UPDATE OF c`,
      [idCita, idUsuario]
    );

    if (citaResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Cita no encontrada.' });
    }

    const cita = citaResult.rows[0];

    if (!['pendiente', 'confirmada'].includes(cita.estado_cita)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Solo se pueden reagendar citas pendientes o confirmadas.' });
    }

    // Bloquear y verificar nuevo slot disponible (mismo médico)
    const nuevoSlot = await client.query(
      `SELECT d.id_disponibilidad, d.fecha::text, d.hora_inicio::text, m.id_especialidad, m.id_usuario AS id_usuario_medico
       FROM   disponibilidad_medica d
       JOIN   medicos m ON d.id_medico = m.id_medico
       WHERE  d.id_disponibilidad = $1
         AND  d.id_medico         = $2
         AND  d.estado            = 'disponible'
         AND  m.estado            = 'activo'
         AND  m.estado_laboral    = 'activo'
         AND  (
           d.fecha > CURRENT_DATE
           OR (d.fecha = CURRENT_DATE AND d.hora_inicio > CURRENT_TIME)
         )
       FOR UPDATE OF d`,
      [nuevoIdDisp, cita.id_medico]
    );

    if (nuevoSlot.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'El horario seleccionado ya no está disponible.' });
    }

    const slot = nuevoSlot.rows[0];

    // Liberar slot anterior
    if (cita.id_disponibilidad) {
      await client.query(
        `UPDATE disponibilidad_medica SET estado = 'disponible' WHERE id_disponibilidad = $1`,
        [cita.id_disponibilidad]
      );
    }

    // Reservar nuevo slot
    await client.query(
      `UPDATE disponibilidad_medica SET estado = 'reservada' WHERE id_disponibilidad = $1`,
      [nuevoIdDisp]
    );

    // Actualizar cita con nuevo horario — 'confirmada' porque el slot ya fue reservado
    await client.query(
      `UPDATE citas_medicas
       SET    id_disponibilidad = $1, fecha_cita = $2::date, hora_cita = $3::time,
              id_especialidad = $4, estado_cita = 'confirmada',
              confirmada_asistencia = NULL
       WHERE  id_cita = $5`,
      [nuevoIdDisp, slot.fecha, slot.hora_inicio, slot.id_especialidad, idCita]
    );

    // Notificación de reprogramación al paciente
    await client.query(
      `INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
       VALUES ($1, 'Cita reagendada', 'Tu cita médica fue reprogramada correctamente.', 'reprogramacion', FALSE)`,
      [idUsuario]
    );

    // Notificación de reprogramación al médico
    await client.query(
      `INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
       VALUES ($1, 'Cita reagendada', 'Un paciente ha reagendado la cita #' || $2 || ' en tu agenda.', 'reprogramacion', FALSE)`,
      [slot.id_usuario_medico, idCita]
    );

    await client.query('COMMIT');
    return res.json({ message: 'Cita reagendada correctamente.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en reagendarCita:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  } finally {
    client.release();
  }
}

/**
 * PATCH /api/paciente/cita/:idCita/confirmar-asistencia
 * El paciente confirma que asistirá a la cita.
 * Se notifica al médico asignado para que sepa que el paciente asistirá.
 * Anti-IDOR: verificación de propiedad vía JWT.
 */
async function confirmarAsistencia(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  const idCita    = parseInt(req.params.idCita, 10);

  if (isNaN(idUsuario) || isNaN(idCita) || idCita < 1) {
    return res.status(400).json({ message: 'Parámetros inválidos.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar propiedad y estado base; la ventana temporal se valida antes de actualizar.
    const citaResult = await client.query(
      `SELECT c.id_cita, c.fecha_cita, c.hora_cita, c.confirmada_asistencia,
              ((c.fecha_cita + c.hora_cita) BETWEEN NOW() AND (NOW() + INTERVAL '24 hours'))
                AS dentro_ventana_confirmacion,
              m.id_usuario AS id_usuario_medico,
              up.nombre AS paciente_nombre, up.apellido AS paciente_apellido
       FROM   citas_medicas c
       JOIN   pacientes     p  ON c.id_paciente = p.id_paciente
       JOIN   usuarios      up ON p.id_usuario  = up.id_usuario
       JOIN   medicos       m  ON c.id_medico   = m.id_medico
       WHERE  c.id_cita    = $1
         AND  p.id_usuario = $2
         AND  c.estado_cita = 'confirmada'
       FOR UPDATE OF c`,
      [idCita, idUsuario]
    );

    if (citaResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Cita no encontrada o no es confirmable.' });
    }

    const cita = citaResult.rows[0];

    if (cita.confirmada_asistencia === true) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Ya confirmaste tu asistencia a esta cita.' });
    }

    if (cita.dentro_ventana_confirmacion !== true) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        message: 'La confirmación de asistencia está disponible solo dentro de las 24 horas previas a la cita.',
      });
    }

    // Marcar asistencia confirmada
    await client.query(
      'UPDATE citas_medicas SET confirmada_asistencia = TRUE WHERE id_cita = $1',
      [idCita]
    );

    // Notificar al médico que el paciente confirmó asistencia
    await client.query(
      `INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
       VALUES ($1, 'Asistencia confirmada',
               $2 || ' ' || $3 || ' ha confirmado asistencia a la cita del ' ||
               to_char($4::date, 'DD/MM/YYYY') || ' a las ' || to_char($5::time, 'HH24:MI') || '.',
               'confirmacion', FALSE)`,
      [cita.id_usuario_medico,
       cita.paciente_nombre, cita.paciente_apellido,
       cita.fecha_cita, cita.hora_cita]
    );

    // Notificar al paciente para su historial
    await client.query(
      `INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
       VALUES ($1, 'Asistencia confirmada', 'Confirmaste tu asistencia a la cita. ¡Te esperamos!', 'confirmacion', FALSE)`,
      [idUsuario]
    );

    await client.query('COMMIT');
    return res.json({ message: 'Asistencia confirmada correctamente.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en confirmarAsistencia:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  } finally {
    client.release();
  }
}

/**
 * GET /api/paciente/historial?tab=pendientes|confirmadas|pasadas
 * Devuelve todas las citas del paciente autenticado, filtradas por pestaña.
 * - pendientes  → 'pendiente', 'reprogramada' con fecha/hora futura
 * - confirmadas → 'confirmada' con fecha/hora futura
 * - pasadas     → estados cerrados o cualquier cita cuya fecha/hora ya venció
 * Incluye es_invitado e id_disponibilidad para que el frontend
 * distinga el badge correcto ("En revisión" solo para invitados).
 * Anti-IDOR: id_usuario siempre del JWT, nunca del cliente.
 */
async function getHistorialCitas(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  const tab = req.query.tab;

  const tabsPermitidos = ['pendientes', 'confirmadas', 'pasadas'];
  if (!tabsPermitidos.includes(tab)) {
    return res.status(400).json({ message: 'El parámetro tab es obligatorio y debe ser pendientes, confirmadas o pasadas.' });
  }

  // Mapa de tab a regla cerrada de estados + temporalidad.
  const filtroTab = {
    pendientes: `
       AND c.estado_cita IN ('pendiente', 'reprogramada')
       AND (c.fecha_cita + c.hora_cita) >= NOW()`,
    confirmadas: `
       AND c.estado_cita = 'confirmada'
       AND (c.fecha_cita + c.hora_cita) >= NOW()`,
    pasadas: `
       AND (
         c.estado_cita IN ('completada', 'cancelada')
         OR (c.fecha_cita + c.hora_cita) < NOW()
       )`,
  };

  const whereTab = filtroTab[tab] ?? '';

  try {
    const citasResult = await pool.query(
      `SELECT
         c.id_cita,
         c.fecha_cita,
         c.hora_cita,
         c.estado_cita,
         c.motivo_consulta,
         c.modalidad,
         c.observaciones,
         c.es_invitado,
         c.id_disponibilidad,
         c.asistio_cita,
         u.nombre             AS medico_nombre,
         u.apellido           AS medico_apellido,
         e.nombre_especialidad,
         ha.diagnostico,
         ha.tratamiento
       FROM   citas_medicas     c
       JOIN   pacientes         p  ON c.id_paciente    = p.id_paciente
       JOIN   medicos           m  ON c.id_medico       = m.id_medico
       JOIN   usuarios          u  ON m.id_usuario      = u.id_usuario
       JOIN   especialidades    e  ON c.id_especialidad = e.id_especialidad
       LEFT JOIN historial_atenciones ha ON ha.id_cita  = c.id_cita
       WHERE  p.id_usuario = $1
       ${whereTab}
       ORDER  BY c.fecha_cita DESC, c.hora_cita DESC`,
      [idUsuario]
    );

    const noLeidas = await contarNotificacionesNoLeidas(idUsuario);

    return res.json({
      citas:    citasResult.rows,
      noLeidas,
    });
  } catch (err) {
    console.error('Error en getHistorialCitas:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * GET /api/paciente/perfil
 * Retorna los datos del perfil del paciente autenticado.
 * Combina datos de usuarios + pacientes para evitar múltiples llamadas.
 * El id_usuario viene siempre del token JWT para prevenir IDOR.
 */
async function getPerfil(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  try {
    // Datos base del usuario y paciente (JOIN protegido por id_usuario del JWT)
    const perfilResult = await pool.query(
      `SELECT
         u.nombre,
         u.apellido,
         u.correo,
         u.telefono,
         u.estado,
         u.fecha_registro,
         p.rut,
         p.fecha_nacimiento,
         p.direccion,
         p.comuna,
         p.ciudad,
         p.contacto_emergencia,
         p.telefono_emergencia
       FROM   usuarios  u
       LEFT JOIN pacientes p ON p.id_usuario = u.id_usuario
       WHERE  u.id_usuario = $1`,
      [idUsuario]
    );

    if (perfilResult.rowCount === 0) {
      return res.status(404).json({ message: 'Perfil no encontrado.' });
    }

    // Próxima cita para el bento de estadísticas
    const citaResult = await pool.query(
      `SELECT
         c.fecha_cita,
         e.nombre_especialidad
       FROM   citas_medicas    c
       JOIN   pacientes        p ON c.id_paciente    = p.id_paciente
       JOIN   especialidades   e ON c.id_especialidad = e.id_especialidad
       WHERE  p.id_usuario   = $1
         AND  c.estado_cita  IN ('pendiente', 'confirmada')
         AND  (c.fecha_cita + c.hora_cita) >= NOW()
       ORDER  BY c.fecha_cita ASC, c.hora_cita ASC
       LIMIT  1`,
      [idUsuario]
    );

    // Alertas = notificaciones no leídas del usuario
    const alertas = await contarNotificacionesNoLeidas(idUsuario);

    const perfil = perfilResult.rows[0];

    return res.json({
      nombre:                perfil.nombre,
      apellido:              perfil.apellido,
      correo:                perfil.correo,
      telefono:              perfil.telefono,
      estado:                perfil.estado,
      fecha_registro:        perfil.fecha_registro,
      rut:                   perfil.rut,
      fecha_nacimiento:      perfil.fecha_nacimiento,
      direccion:             perfil.direccion,
      comuna:                perfil.comuna,
      ciudad:                perfil.ciudad,
      contacto_emergencia:   perfil.contacto_emergencia,
      telefono_emergencia:   perfil.telefono_emergencia,
      proxima_cita:          citaResult.rows[0] ?? null,
      alertas,
    });
  } catch (err) {
    console.error('Error en getPerfil:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * GET /api/paciente/notificaciones
 * Retorna todas las notificaciones del paciente autenticado ordenadas por fecha.
 * El conteo no leido se usa para sincronizar el badge del header.
 */
async function getNotificacionesPaciente(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  try {
    const { limit, offset } = parsePagination(req.query);

    const [notificacionesResult, noLeidas, totalResult] = await Promise.all([
      pool.query(
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
         LIMIT  $2 OFFSET $3`,
        [idUsuario, limit, offset]
      ),
      contarNotificacionesNoLeidas(idUsuario),
      pool.query(
        `SELECT COUNT(*) AS total
         FROM   notificaciones
         WHERE  id_usuario = $1`,
        [idUsuario]
      ),
    ]);

    return res.json({
      notificaciones: notificacionesResult.rows,
      noLeidas,
      total: parseInt(totalResult.rows[0].total, 10),
      limit,
      offset,
    });
  } catch (err) {
    console.error('Error en getNotificacionesPaciente:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * GET /api/paciente/notificaciones/contador
 * Retorna sólo el total de notificaciones no leídas del paciente autenticado.
 */
async function getContadorNotificacionesPaciente(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  try {
    const noLeidas = await contarNotificacionesNoLeidas(idUsuario);
    return res.json({ noLeidas });
  } catch (err) {
    console.error('Error en getContadorNotificacionesPaciente:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * PATCH /api/paciente/notificaciones/marcar-leidas
 * Marca como leidas todas las notificaciones pendientes del paciente autenticado.
 */
async function marcarNotificacionesLeidas(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  try {
    await pool.query(
      `UPDATE notificaciones
       SET    leida = TRUE
       WHERE  id_usuario = $1
         AND  leida = FALSE`,
      [idUsuario]
    );

    return res.json({ message: 'Notificaciones marcadas como leídas.' });
  } catch (err) {
    console.error('Error en marcarNotificacionesLeidas:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * DELETE /api/paciente/notificaciones/:id
 * Elimina una notificación individual del paciente autenticado.
 */
async function eliminarNotificacionPaciente(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  const idNotificacion = parseInt(req.params.id, 10);

  if (isNaN(idUsuario) || isNaN(idNotificacion) || idNotificacion < 1) {
    return res.status(400).json({ message: 'Parámetros inválidos.' });
  }

  try {
    const result = await pool.query(
      `DELETE FROM notificaciones
       WHERE id_notificacion = $1
         AND id_usuario = $2
       RETURNING id_notificacion`,
      [idNotificacion, idUsuario]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Notificación no encontrada.' });
    }

    return res.json({ message: 'Notificación eliminada correctamente.' });
  } catch (err) {
    console.error('Error en eliminarNotificacionPaciente:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * DELETE /api/paciente/notificaciones
 * Elimina todas las notificaciones del paciente autenticado.
 */
async function limpiarNotificacionesPaciente(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  try {
    await pool.query(
      `DELETE FROM notificaciones
       WHERE  id_usuario = $1`,
      [idUsuario]
    );

    return res.json({ message: 'Todas las notificaciones de tu cuenta fueron eliminadas.' });
  } catch (err) {
    console.error('Error en limpiarNotificacionesPaciente:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * PUT /api/paciente/perfil
 * Actualiza los datos personales del paciente autenticado.
 * Campos editables: nombre, apellido, correo, telefono (en usuarios)
 *                   fecha_nacimiento, direccion, comuna, ciudad,
 *                   contacto_emergencia, telefono_emergencia (en pacientes)
 * El RUT nunca se modifica — es identificador único permanente.
 * Anti-IDOR: id_usuario siempre del JWT, nunca del body.
 */
async function actualizarPerfilPaciente(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  const {
    nombre, apellido, correo, telefono,
    fecha_nacimiento, direccion, comuna, ciudad,
    contacto_emergencia, telefono_emergencia,
  } = req.body;

  // Validaciones básicas de campos obligatorios
  if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2 || nombre.trim().length > 100) {
    return res.status(400).json({ message: 'Nombre inválido (2–100 caracteres).' });
  }
  if (!apellido || typeof apellido !== 'string' || apellido.trim().length < 2 || apellido.trim().length > 100) {
    return res.status(400).json({ message: 'Apellido inválido (2–100 caracteres).' });
  }
  if (!correo || typeof correo !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim()) || correo.trim().length > 150) {
    return res.status(400).json({ message: 'Correo electrónico inválido.' });
  }
  if (telefono !== undefined && telefono !== null && telefono !== '' && (typeof telefono !== 'string' || telefono.trim().length > 20)) {
    return res.status(400).json({ message: 'Teléfono inválido.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que el correo no esté tomado por otro usuario
    const correoNorm = correo.trim().toLowerCase();
    const correoExistente = await client.query(
      'SELECT 1 FROM usuarios WHERE correo = $1 AND id_usuario <> $2',
      [correoNorm, idUsuario]
    );
    if (correoExistente.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'El correo ya está registrado por otro usuario.' });
    }

    // Actualizar tabla usuarios
    await client.query(
      `UPDATE usuarios
       SET nombre = $1, apellido = $2, correo = $3, telefono = $4,
           fecha_actualizacion = NOW()
       WHERE id_usuario = $5`,
      [
        nombre.trim(),
        apellido.trim(),
        correoNorm,
        telefono ? telefono.trim() : null,
        idUsuario,
      ]
    );

    // Obtener id_paciente del usuario
    const pacResult = await client.query(
      'SELECT id_paciente FROM pacientes WHERE id_usuario = $1',
      [idUsuario]
    );

    if (pacResult.rowCount > 0) {
      const idPaciente = pacResult.rows[0].id_paciente;
      await client.query(
        `UPDATE pacientes
         SET fecha_nacimiento  = $1,
             direccion         = $2,
             comuna            = $3,
             ciudad            = $4,
             contacto_emergencia  = $5,
             telefono_emergencia  = $6,
             fecha_actualizacion  = NOW()
         WHERE id_paciente = $7`,
        [
          fecha_nacimiento  || null,
          direccion         ? direccion.trim()         : null,
          comuna            ? comuna.trim()            : null,
          ciudad            ? ciudad.trim()            : null,
          contacto_emergencia ? contacto_emergencia.trim() : null,
          telefono_emergencia ? telefono_emergencia.trim() : null,
          idPaciente,
        ]
      );
    }

    await client.query('COMMIT');
    return res.json({ message: 'Datos actualizados correctamente.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en actualizarPerfilPaciente:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  } finally {
    client.release();
  }
}

/**
 * PATCH /api/paciente/perfil/password
 * Cambia la contraseña del paciente autenticado.
 * Requiere body: { contrasena_actual, contrasena_nueva }
 * Verifica la contraseña actual antes de actualizar.
 * Usa pgcrypto (bcrypt/blowfish) para el hash.
 * Anti-IDOR: id_usuario siempre del JWT.
 */
async function cambiarPasswordPaciente(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  const { contrasena_actual, contrasena_nueva } = req.body;

  if (!contrasena_actual || typeof contrasena_actual !== 'string') {
    return res.status(400).json({ message: 'Contraseña actual requerida.' });
  }
  if (!contrasena_nueva || typeof contrasena_nueva !== 'string' || contrasena_nueva.length < 8 || contrasena_nueva.length > 128) {
    return res.status(400).json({ message: 'La nueva contraseña debe tener entre 8 y 128 caracteres.' });
  }

  try {
    // Verificar contraseña actual usando pgcrypto
    const verificacion = await pool.query(
      `SELECT (contrasena_hash = crypt($1, contrasena_hash)) AS valid
       FROM usuarios WHERE id_usuario = $2`,
      [contrasena_actual, idUsuario]
    );

    if (verificacion.rowCount === 0 || !verificacion.rows[0].valid) {
      return res.status(401).json({ message: 'La contraseña actual es incorrecta.' });
    }

    // Actualizar con nuevo hash bcrypt
    await pool.query(
      `UPDATE usuarios
       SET contrasena_hash = crypt($1, gen_salt('bf', 12)),
           fecha_actualizacion = NOW()
       WHERE id_usuario = $2`,
      [contrasena_nueva, idUsuario]
    );

    return res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    console.error('Error en cambiarPasswordPaciente:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

module.exports = {
  getDashboard,
  getEspecialidadesConBadge,
  getProfesionalesPorEspecialidad,
  getDetalleMedico,
  getDisponibilidadMedico,
  crearCitaPaciente,
  getDetalleCita,
  cancelarCita,
  reagendarCita,
  confirmarAsistencia,
  getHistorialCitas,
  getPerfil,
  actualizarPerfilPaciente,
  cambiarPasswordPaciente,
  getNotificacionesPaciente,
  getContadorNotificacionesPaciente,
  marcarNotificacionesLeidas,
  eliminarNotificacionPaciente,
  limpiarNotificacionesPaciente,
};
