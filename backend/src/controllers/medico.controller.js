const pool = require('../db/pool');

/**
 * GET /api/medico/citas-hoy
 * Devuelve las citas del médico autenticado para hoy o anteriores
 * que aún no tienen marcada la asistencia (asistio_cita IS NULL)
 * y cuyo estado sea 'confirmada' o 'completada'.
 * Anti-IDOR: id_usuario se extrae exclusivamente del JWT.
 */
async function getCitasParaMarcar(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  try {
    // Verificar que el usuario es médico y obtener su id_medico
    const medicoResult = await pool.query(
      'SELECT id_medico FROM medicos WHERE id_usuario = $1 AND estado = $2',
      [idUsuario, 'activo']
    );
    if (medicoResult.rowCount === 0) {
      return res.status(403).json({ message: 'No se encontró perfil de médico activo.' });
    }
    const idMedico = medicoResult.rows[0].id_medico;

    // Citas confirmadas cuya fecha ya pasó o es hoy, sin asistencia marcada
    const citasResult = await pool.query(
      `SELECT
         c.id_cita,
         c.fecha_cita,
         c.hora_cita,
         c.estado_cita,
         c.modalidad,
         c.motivo_consulta,
         c.confirmada_asistencia,
         c.asistio_cita,
         up.nombre    AS paciente_nombre,
         up.apellido  AS paciente_apellido,
         e.nombre_especialidad
       FROM   citas_medicas  c
       JOIN   pacientes      p  ON c.id_paciente    = p.id_paciente
       JOIN   usuarios       up ON p.id_usuario     = up.id_usuario
       JOIN   especialidades e  ON c.id_especialidad = e.id_especialidad
       WHERE  c.id_medico   = $1
         AND  c.estado_cita IN ('confirmada', 'completada')
         AND  c.fecha_cita  <= CURRENT_DATE
         -- Evita mostrar citas que ya fueron marcadas como asistidas o inasistidas
         AND  c.asistio_cita IS NULL
       ORDER  BY c.fecha_cita DESC, c.hora_cita DESC`,
      [idMedico]
    );

    const unreadResult = await pool.query(
      `SELECT COUNT(*) AS total FROM notificaciones WHERE id_usuario = $1 AND leida = FALSE`,
      [idUsuario]
    );

    return res.json({
      citas:    citasResult.rows,
      noLeidas: parseInt(unreadResult.rows[0].total, 10),
    });
  } catch (err) {
    console.error('Error en getCitasParaMarcar:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * GET /api/medico/citas-proximas
 * Devuelve las citas futuras del médico autenticado (confirmadas).
 */
async function getCitasProximas(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  try {
    const medicoResult = await pool.query(
      'SELECT id_medico FROM medicos WHERE id_usuario = $1 AND estado = $2',
      [idUsuario, 'activo']
    );
    if (medicoResult.rowCount === 0) {
      return res.status(403).json({ message: 'No se encontró perfil de médico activo.' });
    }
    const idMedico = medicoResult.rows[0].id_medico;

    const citasResult = await pool.query(
      `SELECT
         c.id_cita,
         c.fecha_cita,
         c.hora_cita,
         c.estado_cita,
         c.modalidad,
         c.motivo_consulta,
         c.confirmada_asistencia,
         up.nombre    AS paciente_nombre,
         up.apellido  AS paciente_apellido,
         e.nombre_especialidad
       FROM   citas_medicas  c
       JOIN   pacientes      p  ON c.id_paciente    = p.id_paciente
       JOIN   usuarios       up ON p.id_usuario     = up.id_usuario
       JOIN   especialidades e  ON c.id_especialidad = e.id_especialidad
       WHERE  c.id_medico   = $1
         AND  c.estado_cita = 'confirmada'
         AND  c.fecha_cita  > CURRENT_DATE
       ORDER  BY c.fecha_cita ASC, c.hora_cita ASC`,
      [idMedico]
    );

    const unreadResult = await pool.query(
      `SELECT COUNT(*) AS total FROM notificaciones WHERE id_usuario = $1 AND leida = FALSE`,
      [idUsuario]
    );

    return res.json({
      citas:    citasResult.rows,
      noLeidas: parseInt(unreadResult.rows[0].total, 10),
    });
  } catch (err) {
    console.error('Error en getCitasProximas:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * PATCH /api/medico/cita/:idCita/marcar-asistencia
 * El médico marca si el paciente asistió o no a la cita.
 * Body: { asistio: boolean }
 * Cambia estado_cita a 'completada' y notifica al paciente.
 * Anti-IDOR: solo el médico asignado a la cita puede marcarla.
 */
async function marcarAsistencia(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  const idCita    = parseInt(req.params.idCita, 10);

  if (isNaN(idUsuario) || isNaN(idCita) || idCita < 1) {
    return res.status(400).json({ message: 'Parámetros inválidos.' });
  }

  const { asistio } = req.body;
  if (typeof asistio !== 'boolean') {
    return res.status(400).json({ message: 'El campo "asistio" debe ser true o false.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que el usuario es médico
    const medicoResult = await client.query(
      'SELECT id_medico FROM medicos WHERE id_usuario = $1 AND estado = $2',
      [idUsuario, 'activo']
    );
    if (medicoResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'No se encontró perfil de médico activo.' });
    }
    const idMedico = medicoResult.rows[0].id_medico;

    // Verificar que la cita pertenece a este médico y es marcable
    const citaResult = await client.query(
      `SELECT c.id_cita, c.estado_cita, c.asistio_cita, c.fecha_cita, c.hora_cita,
              p.id_usuario AS id_usuario_paciente
       FROM   citas_medicas c
       JOIN   pacientes     p ON c.id_paciente = p.id_paciente
       WHERE  c.id_cita   = $1
         AND  c.id_medico = $2
       FOR UPDATE OF c`,
      [idCita, idMedico]
    );

    if (citaResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Cita no encontrada o no pertenece a este médico.' });
    }

    const cita = citaResult.rows[0];

    // Solo citas confirmadas o completadas sin asistencia previa pueden marcarse
    if (!['confirmada', 'completada'].includes(cita.estado_cita)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Solo se puede marcar asistencia en citas confirmadas o completadas.' });
    }

    if (cita.asistio_cita !== null) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'La asistencia de esta cita ya fue registrada.' });
    }

    // Marcar asistencia y cambiar estado a completada
    await client.query(
      `UPDATE citas_medicas
       SET    asistio_cita = $1, estado_cita = 'completada'
       WHERE  id_cita = $2`,
      [asistio, idCita]
    );

    // Notificar al paciente del resultado
    const mensajePaciente = asistio
      ? 'Tu cita médica del ' + cita.fecha_cita.toISOString().split('T')[0] + ' fue marcada como completada. ¡Gracias por asistir!'
      : 'Tu cita médica del ' + cita.fecha_cita.toISOString().split('T')[0] + ' fue registrada como inasistencia.';

    const tipoPaciente = asistio ? 'confirmacion' : 'general';

    await client.query(
      `INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
       VALUES ($1, $2, $3, $4, FALSE)`,
      [cita.id_usuario_paciente,
       asistio ? 'Cita completada' : 'Inasistencia registrada',
       mensajePaciente,
       tipoPaciente]
    );

    // Notificar al médico para su registro
    await client.query(
      `INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
       VALUES ($1, $2, $3, 'confirmacion', FALSE)`,
      [idUsuario,
       asistio ? 'Asistencia registrada' : 'Inasistencia registrada',
       asistio ? 'Marcaste como asistida la cita #' + idCita + '.' : 'Marcaste como inasistencia la cita #' + idCita + '.']
    );

    await client.query('COMMIT');
    return res.json({
      message: asistio ? 'Asistencia registrada correctamente.' : 'Inasistencia registrada correctamente.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en marcarAsistencia:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  } finally {
    client.release();
  }
}

/**
 * GET /api/medico/dashboard
 * Resumen del médico: citas de hoy, pendientes de marcar, próximas.
 */
async function getDashboardMedico(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  try {
    const medicoResult = await pool.query(
      'SELECT id_medico FROM medicos WHERE id_usuario = $1 AND estado = $2',
      [idUsuario, 'activo']
    );
    if (medicoResult.rowCount === 0) {
      return res.status(403).json({ message: 'No se encontró perfil de médico activo.' });
    }
    const idMedico = medicoResult.rows[0].id_medico;

    // Citas de hoy
    const citasHoyResult = await pool.query(
      `SELECT
         c.id_cita, c.hora_cita, c.estado_cita, c.modalidad,
         c.motivo_consulta, c.confirmada_asistencia, c.asistio_cita,
         up.nombre AS paciente_nombre, up.apellido AS paciente_apellido,
         e.nombre_especialidad
       FROM   citas_medicas  c
       JOIN   pacientes      p  ON c.id_paciente    = p.id_paciente
       JOIN   usuarios       up ON p.id_usuario     = up.id_usuario
       JOIN   especialidades e  ON c.id_especialidad = e.id_especialidad
       WHERE  c.id_medico   = $1
         AND  c.fecha_cita  = CURRENT_DATE
         AND  c.estado_cita IN ('confirmada', 'completada')
       ORDER  BY c.hora_cita ASC`,
      [idMedico]
    );

    // Cantidad de citas pendientes de marcar asistencia (pasadas sin marcar)
    const pendientesResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM   citas_medicas
       WHERE  id_medico   = $1
         AND  estado_cita = 'confirmada'
         AND  fecha_cita  <= CURRENT_DATE
         AND  asistio_cita IS NULL`,
      [idMedico]
    );

    // Próxima cita futura
    const proximaResult = await pool.query(
      `SELECT
         c.id_cita, c.fecha_cita, c.hora_cita, c.modalidad,
         up.nombre AS paciente_nombre, up.apellido AS paciente_apellido,
         e.nombre_especialidad
       FROM   citas_medicas  c
       JOIN   pacientes      p  ON c.id_paciente    = p.id_paciente
       JOIN   usuarios       up ON p.id_usuario     = up.id_usuario
       JOIN   especialidades e  ON c.id_especialidad = e.id_especialidad
       WHERE  c.id_medico   = $1
         AND  c.estado_cita = 'confirmada'
         AND  c.fecha_cita  > CURRENT_DATE
       ORDER  BY c.fecha_cita ASC, c.hora_cita ASC
       LIMIT  1`,
      [idMedico]
    );

    const unreadResult = await pool.query(
      `SELECT COUNT(*) AS total FROM notificaciones WHERE id_usuario = $1 AND leida = FALSE`,
      [idUsuario]
    );

    return res.json({
      citasHoy:              citasHoyResult.rows,
      pendientesMarcar:      parseInt(pendientesResult.rows[0].total, 10),
      proximaCita:           proximaResult.rows[0] ?? null,
      noLeidas:              parseInt(unreadResult.rows[0].total, 10),
    });
  } catch (err) {
    console.error('Error en getDashboardMedico:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}


/**
 * Edu: endpoint inicial de ficha clínica básica para el módulo médico.
 * GET /api/medico/paciente/:idPaciente/ficha
 * Devuelve datos personales, historial de atenciones y citas vinculadas con el profesional.
 * Seguridad anti-IDOR: solo permite consultar pacientes asociados al médico autenticado.
 */
async function getFichaPaciente(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  const idPaciente = parseInt(req.params.idPaciente, 10);

  if (isNaN(idUsuario) || isNaN(idPaciente) || idPaciente < 1) {
    return res.status(400).json({ message: 'Parámetros inválidos.' });
  }

  try {
    const medicoResult = await pool.query(
      'SELECT id_medico FROM medicos WHERE id_usuario = $1 AND estado = $2',
      [idUsuario, 'activo']
    );

    if (medicoResult.rowCount === 0) {
      return res.status(403).json({ message: 'No se encontró perfil de médico activo.' });
    }

    const idMedico = medicoResult.rows[0].id_medico;

    // Edu: validación anti-IDOR; el médico solo puede ver pacientes relacionados con sus citas.
    const relacionResult = await pool.query(
      `SELECT 1
       FROM   citas_medicas
       WHERE  id_medico = $1
         AND  id_paciente = $2
       LIMIT  1`,
      [idMedico, idPaciente]
    );

    if (relacionResult.rowCount === 0) {
      return res.status(404).json({ message: 'Paciente no encontrado o no asociado a este médico.' });
    }

    const pacienteResult = await pool.query(
      `SELECT
         p.id_paciente,
         p.rut,
         u.nombre,
         u.apellido,
         u.correo,
         u.telefono,
         u.estado
       FROM   pacientes p
       JOIN   usuarios  u ON p.id_usuario = u.id_usuario
       WHERE  p.id_paciente = $1`,
      [idPaciente]
    );

    if (pacienteResult.rowCount === 0) {
      return res.status(404).json({ message: 'Paciente no encontrado.' });
    }

    // Edu: historial clínico previamente registrado para este paciente con este médico.
    const historialResult = await pool.query(
      `SELECT
         h.id_historial,
         h.id_cita,
         h.diagnostico,
         h.tratamiento,
         h.observaciones,
         h.fecha_registro,
         c.fecha_cita,
         c.hora_cita,
         c.modalidad,
         c.motivo_consulta,
         c.estado_cita,
         c.asistio_cita,
         e.nombre_especialidad
       FROM   historial_atenciones h
       JOIN   citas_medicas        c ON h.id_cita = c.id_cita
       JOIN   especialidades       e ON c.id_especialidad = e.id_especialidad
       WHERE  c.id_medico = $1
         AND  c.id_paciente = $2
       ORDER  BY h.fecha_registro DESC`,
      [idMedico, idPaciente]
    );

    // Edu: citas asociadas al paciente dentro de la atención del médico autenticado.
    const citasResult = await pool.query(
      `SELECT
         c.id_cita,
         c.fecha_cita,
         c.hora_cita,
         c.estado_cita,
         c.modalidad,
         c.motivo_consulta,
         c.confirmada_asistencia,
         c.asistio_cita,
         e.nombre_especialidad
       FROM   citas_medicas  c
       JOIN   especialidades e ON c.id_especialidad = e.id_especialidad
       WHERE  c.id_medico = $1
         AND  c.id_paciente = $2
       ORDER  BY c.fecha_cita DESC, c.hora_cita DESC`,
      [idMedico, idPaciente]
    );

    return res.json({
      paciente: pacienteResult.rows[0],
      historial: historialResult.rows,
      citas: citasResult.rows,
    });
  } catch (err) {
    console.error('Error en getFichaPaciente:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}


/**
 * Edu: listado inicial de pacientes vinculados al médico autenticado.
 * GET /api/medico/pacientes
 * Retorna pacientes únicos que tengan al menos una cita con el profesional.
 */
async function getPacientesMedico(req, res) {
  const idUsuario = parseInt(req.user.id, 10);

  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  try {
    const medicoResult = await pool.query(
      'SELECT id_medico FROM medicos WHERE id_usuario = $1 AND estado = $2',
      [idUsuario, 'activo']
    );

    if (medicoResult.rowCount === 0) {
      return res.status(403).json({ message: 'No se encontró perfil de médico activo.' });
    }

    const idMedico = medicoResult.rows[0].id_medico;

    // Edu: pacientes únicos asociados por citas médicas registradas.
    const pacientesResult = await pool.query(
      `SELECT DISTINCT
         p.id_paciente,
         p.rut,
         u.nombre,
         u.apellido,
         u.correo,
         u.telefono,
         u.estado,
         MAX(c.fecha_cita) AS ultima_cita
       FROM   citas_medicas c
       JOIN   pacientes     p ON c.id_paciente = p.id_paciente
       JOIN   usuarios      u ON p.id_usuario = u.id_usuario
       WHERE  c.id_medico = $1
       GROUP  BY p.id_paciente, p.rut, u.nombre, u.apellido, u.correo, u.telefono, u.estado
       ORDER  BY u.apellido ASC, u.nombre ASC`,
      [idMedico]
    );

    return res.json({
      pacientes: pacientesResult.rows,
    });
  } catch (err) {
    console.error('Error en getPacientesMedico:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

module.exports = {
  getDashboardMedico,
  getCitasParaMarcar,
  getCitasProximas,
  marcarAsistencia,
  getFichaPaciente,
  getPacientesMedico,
};
