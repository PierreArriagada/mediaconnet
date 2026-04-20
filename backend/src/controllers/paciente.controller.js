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
      noLeidas:                 parseInt(unreadResult.rows[0].total, 10),
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
       WHERE  m.id_medico = $1 AND m.estado = 'activo'`,
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
       WHERE  id_medico = $1 AND fecha >= CURRENT_DATE
         AND  estado IN ('disponible', 'reservada')
       GROUP  BY EXTRACT(ISODOW FROM fecha)
       ORDER  BY dia_semana`,
      [idMedico]
    );

    // Próximo slot disponible
    const nextSlotResult = await pool.query(
      `SELECT fecha::text, hora_inicio::text, hora_fin::text
       FROM   disponibilidad_medica
       WHERE  id_medico = $1 AND fecha >= CURRENT_DATE AND estado = 'disponible'
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

    const unreadResult = await pool.query(
      `SELECT COUNT(*) AS total FROM notificaciones WHERE id_usuario = $1 AND leida = FALSE`,
      [idUsuario]
    );

    return res.json({
      medico:          medicoResult.rows[0],
      horarioAtencion: scheduleResult.rows,
      proximoSlot:     nextSlotResult.rows[0] ?? null,
      totalConsultas:  parseInt(consultasResult.rows[0].total, 10),
      noLeidas:        parseInt(unreadResult.rows[0].total, 10),
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
       WHERE  m.id_medico = $1 AND m.estado = 'activo'`,
      [idMedico]
    );

    if (medicoResult.rowCount === 0) {
      return res.status(404).json({ message: 'Médico no encontrado.' });
    }

    // Todos los slots disponibles futuros
    const dispResult = await pool.query(
      `SELECT id_disponibilidad, fecha::text, hora_inicio::text, hora_fin::text
       FROM   disponibilidad_medica
       WHERE  id_medico = $1 AND fecha >= CURRENT_DATE AND estado = 'disponible'
       ORDER  BY fecha ASC, hora_inicio ASC`,
      [idMedico]
    );

    const unreadResult = await pool.query(
      `SELECT COUNT(*) AS total FROM notificaciones WHERE id_usuario = $1 AND leida = FALSE`,
      [idUsuario]
    );

    return res.json({
      medico:         medicoResult.rows[0],
      disponibilidad: dispResult.rows,
      noLeidas:       parseInt(unreadResult.rows[0].total, 10),
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
      `SELECT id_disponibilidad, fecha::text, hora_inicio::text
       FROM   disponibilidad_medica
       WHERE  id_disponibilidad = $1 AND id_medico = $2 AND estado = 'disponible'
       FOR UPDATE`,
      [idDisp, idMedico]
    );

    if (dispResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'El horario seleccionado ya no está disponible.' });
    }

    const slot = dispResult.rows[0];

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
      [idPaciente, idMedico, idEsp, idDisp, modalidad.trim(), slot.fecha, slot.hora_inicio, motivo_consulta.trim()]
    );

    // Crear notificación de confirmación
    await client.query(
      `INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
       VALUES ($1, 'Cita reservada', 'Tu cita médica fue registrada correctamente.', 'confirmacion', FALSE)`,
      [idUsuario]
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
         c.id_disponibilidad, c.id_medico, c.id_especialidad, c.es_invitado,
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

    const unreadResult = await pool.query(
      `SELECT COUNT(*) AS total FROM notificaciones WHERE id_usuario = $1 AND leida = FALSE`,
      [idUsuario]
    );

    return res.json({
      cita:     citaResult.rows[0],
      noLeidas: parseInt(unreadResult.rows[0].total, 10),
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
               $2 || ' ha cancelado su cita del ' ||
               to_char($3::date, 'DD/MM/YYYY') || ' a las ' || to_char($4::time, 'HH24:MI') || '.',
               'cancelacion', FALSE)`,
      [cita.id_usuario_medico,
       cita.paciente_nombre + ' ' + cita.paciente_apellido,
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
      `SELECT id_disponibilidad, fecha::text, hora_inicio::text
       FROM   disponibilidad_medica
       WHERE  id_disponibilidad = $1
         AND  id_medico         = $2
         AND  estado            = 'disponible'
       FOR UPDATE`,
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
              estado_cita = 'confirmada', confirmada_asistencia = NULL
       WHERE  id_cita = $4`,
      [nuevoIdDisp, slot.fecha, slot.hora_inicio, idCita]
    );

    // Notificación de reprogramación
    await client.query(
      `INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
       VALUES ($1, 'Cita reagendada', 'Tu cita médica fue reprogramada correctamente.', 'reprogramacion', FALSE)`,
      [idUsuario]
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

    // Verificar propiedad + que sea confirmable (solo citas confirmadas sin asistencia previa)
    const citaResult = await client.query(
      `SELECT c.id_cita, c.fecha_cita, c.hora_cita, c.confirmada_asistencia,
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

    // Marcar asistencia confirmada
    await client.query(
      'UPDATE citas_medicas SET confirmada_asistencia = TRUE WHERE id_cita = $1',
      [idCita]
    );

    // Notificar al médico que el paciente confirmó asistencia
    await client.query(
      `INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
       VALUES ($1, 'Asistencia confirmada',
               $2 || ' ha confirmado asistencia a la cita del ' ||
               to_char($3::date, 'DD/MM/YYYY') || ' a las ' || to_char($4::time, 'HH24:MI') || '.',
               'confirmacion', FALSE)`,
      [cita.id_usuario_medico,
       cita.paciente_nombre + ' ' + cita.paciente_apellido,
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
 * - pendientes  → 'pendiente', 'reprogramada'
 * - confirmadas → 'confirmada'
 * - pasadas     → 'completada', 'cancelada'
 * Incluye es_invitado e id_disponibilidad para que el frontend
 * distinga el badge correcto ("En revisión" solo para invitados).
 * Anti-IDOR: id_usuario siempre del JWT, nunca del cliente.
 */
async function getHistorialCitas(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  const tab = req.query.tab ?? '';

  // Mapa de tab a lista de estados permitidos
  const filtroEstado = {
    pendientes:  ["'pendiente'",  "'reprogramada'"],
    confirmadas: ["'confirmada'"],
    pasadas:     ["'completada'", "'cancelada'"],
  };

  const estados = filtroEstado[tab];
  const whereEstado = estados
    ? `AND c.estado_cita IN (${estados.join(',')})`
    : '';

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
       ${whereEstado}
       ORDER  BY c.fecha_cita DESC, c.hora_cita DESC`,
      [idUsuario]
    );

    const unreadResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM   notificaciones
       WHERE  id_usuario = $1 AND leida = FALSE`,
      [idUsuario]
    );

    return res.json({
      citas:    citasResult.rows,
      noLeidas: parseInt(unreadResult.rows[0].total, 10),
    });
  } catch (err) {
    console.error('Error en getHistorialCitas:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

module.exports = { getDashboard, getEspecialidadesConBadge, getProfesionalesPorEspecialidad, getDetalleMedico, getDisponibilidadMedico, crearCitaPaciente, getDetalleCita, cancelarCita, reagendarCita, confirmarAsistencia, getHistorialCitas };
