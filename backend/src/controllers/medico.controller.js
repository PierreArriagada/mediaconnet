const fs = require('fs');
const path = require('path');
const { parsePagination } = require('../utils/pagination');

const pool = require('../db/pool');

const MAX_TEXTO_CLINICO = 5000;
const MAX_NOTA_DISPONIBILIDAD = 255;
const MAX_BLOQUES_DISPONIBILIDAD = 200;
const MAX_DIAS_FUTURO_DISPONIBILIDAD = 365;
const ESTADOS_DISPONIBILIDAD_MEDICO = new Set(['disponible', 'bloqueada']);
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

function validarPayloadHistorialAtencion(body = {}) {
  const campos = ['diagnostico', 'tratamiento', 'observaciones'];
  const data = {};

  for (const campo of campos) {
    const valor = body[campo];

    if (valor === undefined || valor === null) {
      data[campo] = null;
      continue;
    }

    if (typeof valor !== 'string') {
      return { error: `El campo "${campo}" debe ser texto.` };
    }

    const limpio = valor.trim();
    if (limpio.length > MAX_TEXTO_CLINICO) {
      return { error: `El campo "${campo}" no puede superar ${MAX_TEXTO_CLINICO} caracteres.` };
    }

    data[campo] = limpio || null;
  }

  if (!data.diagnostico && !data.tratamiento && !data.observaciones) {
    return { error: 'Debes registrar diagnóstico, tratamiento u observaciones clínicas.' };
  }

  return { data };
}

function normalizarFechaISO(valor) {
  if (typeof valor !== 'string') return null;
  const fecha = valor.trim();
  if (!ISO_DATE_RE.test(fecha)) return null;

  const [year, month, day] = fecha.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return fecha;
}

function normalizarHora(valor) {
  if (typeof valor !== 'string') return null;
  const match = valor.trim().match(TIME_RE);
  if (!match) return null;

  const hora = `${match[1]}:${match[2]}`;
  const minutos = Number(match[1]) * 60 + Number(match[2]);
  return { hora, minutos };
}

function fechaHoraLocal(fecha, hora) {
  const [year, month, day] = fecha.split('-').map(Number);
  const [hours, minutes] = hora.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

function validarNotaDisponibilidad(nota) {
  if (nota === undefined || nota === null) return { data: null };
  if (typeof nota !== 'string') return { error: 'La nota debe ser texto.' };

  const limpia = nota.trim();
  if (limpia.length > MAX_NOTA_DISPONIBILIDAD) {
    return { error: `La nota no puede superar ${MAX_NOTA_DISPONIBILIDAD} caracteres.` };
  }

  return { data: limpia || null };
}

function validarBloqueDisponibilidad(bloque, opciones = {}) {
  const { requerirFuturo = true } = opciones;
  const fecha = normalizarFechaISO(bloque?.fecha);
  if (!fecha) return { error: 'La fecha debe tener formato YYYY-MM-DD y ser válida.' };

  const inicio = normalizarHora(bloque?.hora_inicio);
  if (!inicio) return { error: 'La hora de inicio debe tener formato HH:MM.' };

  const fin = normalizarHora(bloque?.hora_fin);
  if (!fin) return { error: 'La hora de término debe tener formato HH:MM.' };

  if (fin.minutos <= inicio.minutos) {
    return { error: 'La hora de término debe ser posterior a la hora de inicio.' };
  }

  const estado = bloque?.estado ?? 'disponible';
  if (typeof estado !== 'string' || !ESTADOS_DISPONIBILIDAD_MEDICO.has(estado)) {
    return { error: 'El estado debe ser disponible o bloqueada.' };
  }

  const inicioDate = fechaHoraLocal(fecha, inicio.hora);
  if (requerirFuturo && inicioDate <= new Date()) {
    return { error: 'La disponibilidad debe comenzar en una fecha y hora futura.' };
  }

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + MAX_DIAS_FUTURO_DISPONIBILIDAD);
  if (inicioDate > maxDate) {
    return { error: `La disponibilidad no puede superar ${MAX_DIAS_FUTURO_DISPONIBILIDAD} días hacia el futuro.` };
  }

  return {
    data: {
      fecha,
      hora_inicio: inicio.hora,
      hora_fin: fin.hora,
      estado,
    },
  };
}

async function existeSolapamientoDisponibilidad(queryable, {
  idMedico,
  fecha,
  horaInicio,
  horaFin,
  excluirId = null,
}) {
  const params = [idMedico, fecha, horaInicio, horaFin];
  let excluir = '';

  if (excluirId !== null) {
    params.push(excluirId);
    excluir = `AND id_disponibilidad <> $${params.length}`;
  }

  const result = await queryable.query(
    `SELECT 1
     FROM disponibilidad_medica
     WHERE id_medico = $1
       AND fecha = $2::date
       AND hora_inicio < $4::time
       AND hora_fin > $3::time
       ${excluir}
     LIMIT 1`,
    params
  );

  return result.rowCount > 0;
}

/**
 * GET /api/medico/notificaciones
 * Devuelve las notificaciones del médico autenticado.
 */
async function getNotificacionesMedico(req, res) {
  const idUsuario = parseInt(req.user.id, 10);

  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  try {
    const { limit, offset } = parsePagination(req.query);

    const [notificacionesResult, unreadResult, totalResult] = await Promise.all([
      pool.query(
        `SELECT
           id_notificacion,
           titulo,
           mensaje,
           tipo,
           leida,
           fecha_envio
         FROM notificaciones
         WHERE id_usuario = $1
         ORDER BY fecha_envio DESC
         LIMIT $2 OFFSET $3`,
        [idUsuario, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) AS total
         FROM notificaciones
         WHERE id_usuario = $1 AND leida = FALSE`,
        [idUsuario]
      ),
      pool.query(
        `SELECT COUNT(*) AS total
         FROM notificaciones
         WHERE id_usuario = $1`,
        [idUsuario]
      ),
    ]);

    return res.json({
      notificaciones: notificacionesResult.rows,
      noLeidas: parseInt(unreadResult.rows[0].total, 10),
      total: parseInt(totalResult.rows[0].total, 10),
      limit,
      offset,
    });
  } catch (err) {
    console.error('Error en getNotificacionesMedico:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * PATCH /api/medico/notificaciones/:id/leida
 * Marca una notificación del médico autenticado como leída o no leída.
 * Body opcional: { leida: boolean }
 */
async function actualizarEstadoNotificacionMedico(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  const idNotificacion = parseInt(req.params.id, 10);
  const leida = typeof req.body?.leida === 'boolean' ? req.body.leida : true;

  if (isNaN(idUsuario) || isNaN(idNotificacion) || idNotificacion < 1) {
    return res.status(400).json({ message: 'Parámetros inválidos.' });
  }

  try {
    const result = await pool.query(
      `UPDATE notificaciones
       SET leida = $1
       WHERE id_notificacion = $2
         AND id_usuario = $3
       RETURNING id_notificacion, titulo, mensaje, tipo, leida, fecha_envio`,
      [leida, idNotificacion, idUsuario]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Notificación no encontrada.' });
    }

    return res.json({ notificacion: result.rows[0] });
  } catch (err) {
    console.error('Error en actualizarEstadoNotificacionMedico:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * PATCH /api/medico/notificaciones/marcar-leidas
 * Marca todas las notificaciones no leídas del médico autenticado como leídas.
 */
async function marcarNotificacionesLeidasMedico(req, res) {
  const idUsuario = parseInt(req.user.id, 10);

  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  try {
    await pool.query(
      `UPDATE notificaciones
       SET leida = TRUE
       WHERE id_usuario = $1
         AND leida = FALSE`,
      [idUsuario]
    );

    return res.json({ message: 'Notificaciones marcadas como leídas.' });
  } catch (err) {
    console.error('Error en marcarNotificacionesLeidasMedico:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * DELETE /api/medico/notificaciones
 * Elimina todas las notificaciones del médico autenticado.
 */
async function limpiarNotificacionesMedico(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  try {
    await pool.query(
      `DELETE FROM notificaciones WHERE id_usuario = $1`,
      [idUsuario]
    );
    return res.json({ message: 'Notificaciones eliminadas correctamente.' });
  } catch (err) {
    console.error('Error en limpiarNotificacionesMedico:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * DELETE /api/medico/notificaciones/:id
 * Elimina una notificación perteneciente al médico autenticado.
 */
async function eliminarNotificacionMedico(req, res) {
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
    console.error('Error en eliminarNotificacionMedico:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}
/**
 * Edu: obtiene el perfil del médico autenticado
 * GET /api/medico/perfil
 * Devuelve datos básicos del médico según el usuario del token
 */
async function getPerfilMedico(req, res) {
  const idUsuario = parseInt(req.user.id, 10);

  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  try {
    const result = await pool.query(
      `SELECT
         m.id_medico,
         u.nombre,
         u.apellido,
         u.correo,
         u.telefono,
         u.estado,
         u.foto_perfil_url,
         m.numero_registro,
         m.anios_experiencia,
         e.nombre_especialidad
       FROM medicos m
       JOIN usuarios u ON m.id_usuario = u.id_usuario
       JOIN especialidades e ON m.id_especialidad = e.id_especialidad
       WHERE m.id_usuario = $1
         AND m.estado = 'activo'`,
      [idUsuario]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Perfil médico no encontrado.' });
    }

    return res.json({ perfil: result.rows[0] });
  } catch (err) {
    console.error('Error en getPerfilMedico:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

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

    // Citas confirmadas cuya fecha y hora ya pasaron, sin asistencia marcada
    const citasResult = await pool.query(
      `SELECT
         c.id_cita,
         c.id_paciente,
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
         AND  (c.fecha_cita + c.hora_cita) <= NOW()
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
         c.id_paciente,
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
         -- Edu: mostrar próximas solicitudes/citas pendientes o confirmadas desde ahora en adelante.
         AND  c.estado_cita IN ('pendiente', 'confirmada')
         AND  (c.fecha_cita + c.hora_cita) > NOW()
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
 * GET /api/medico/cita/:idCita
 * Devuelve el detalle clínico de una cita asignada al médico autenticado.
 * Anti-IDOR: la cita debe pertenecer al id_medico derivado del JWT.
 */
async function getDetalleCitaMedico(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  const idCita = parseInt(req.params.idCita, 10);

  if (isNaN(idUsuario) || isNaN(idCita) || idCita < 1) {
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

    const citaResult = await pool.query(
      `SELECT
         c.id_cita,
         c.id_paciente,
         c.id_especialidad,
         c.id_disponibilidad,
         c.fecha_cita::text AS fecha_cita,
         c.hora_cita::text  AS hora_cita,
         c.estado_cita,
         c.modalidad,
         c.motivo_consulta,
         c.observaciones AS observaciones_cita,
         c.es_invitado,
         c.confirmada_asistencia,
         c.asistio_cita,
         p.rut AS paciente_rut,
         COALESCE(up.nombre, c.nombre_invitado, 'Paciente') AS paciente_nombre,
         COALESCE(up.apellido, c.apellido_invitado, '') AS paciente_apellido,
         COALESCE(up.correo, c.correo_invitado, '') AS paciente_correo,
         COALESCE(up.telefono, c.telefono_invitado, '') AS paciente_telefono,
         e.nombre_especialidad,
         ((c.fecha_cita + c.hora_cita) <= NOW()) AS cita_ocurrida
       FROM   citas_medicas  c
       JOIN   pacientes      p  ON c.id_paciente     = p.id_paciente
       LEFT JOIN usuarios    up ON p.id_usuario      = up.id_usuario
       JOIN   especialidades e  ON c.id_especialidad = e.id_especialidad
       WHERE  c.id_cita   = $1
         AND  c.id_medico = $2`,
      [idCita, idMedico]
    );

    if (citaResult.rowCount === 0) {
      return res.status(404).json({ message: 'Cita no encontrada o no pertenece a este médico.' });
    }

    const historialResult = await pool.query(
      `SELECT
         id_historial,
         id_cita,
         diagnostico,
         tratamiento,
         observaciones,
         fecha_registro
       FROM historial_atenciones
       WHERE id_cita = $1`,
      [idCita]
    );

    const unreadResult = await pool.query(
      `SELECT COUNT(*) AS total FROM notificaciones WHERE id_usuario = $1 AND leida = FALSE`,
      [idUsuario]
    );

    const cita = citaResult.rows[0];
    const puedeRegistrarHistorial = Boolean(
      cita.cita_ocurrida && ['confirmada', 'completada'].includes(cita.estado_cita)
    );

    return res.json({
      cita,
      historial: historialResult.rows[0] ?? null,
      puedeRegistrarHistorial,
      noLeidas: parseInt(unreadResult.rows[0].total, 10),
    });
  } catch (err) {
    console.error('Error en getDetalleCitaMedico:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * PUT /api/medico/cita/:idCita/historial
 * Crea o actualiza el historial clínico de una cita del médico autenticado.
 */
async function guardarHistorialCitaMedico(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  const idCita = parseInt(req.params.idCita, 10);

  if (isNaN(idUsuario) || isNaN(idCita) || idCita < 1) {
    return res.status(400).json({ message: 'Parámetros inválidos.' });
  }

  const validacion = validarPayloadHistorialAtencion(req.body);
  if (validacion.error) {
    return res.status(400).json({ message: validacion.error });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const medicoResult = await client.query(
      'SELECT id_medico FROM medicos WHERE id_usuario = $1 AND estado = $2',
      [idUsuario, 'activo']
    );
    if (medicoResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'No se encontró perfil de médico activo.' });
    }
    const idMedico = medicoResult.rows[0].id_medico;

    const citaResult = await client.query(
      `SELECT
         id_cita,
         estado_cita,
         ((fecha_cita + hora_cita) <= NOW()) AS cita_ocurrida
       FROM citas_medicas
       WHERE id_cita = $1
         AND id_medico = $2
       FOR UPDATE`,
      [idCita, idMedico]
    );

    if (citaResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Cita no encontrada o no pertenece a este médico.' });
    }

    const cita = citaResult.rows[0];
    if (!cita.cita_ocurrida) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'El historial clínico solo puede registrarse cuando la cita ya ocurrió.' });
    }

    if (!['confirmada', 'completada'].includes(cita.estado_cita)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'El historial clínico solo puede registrarse en citas confirmadas o completadas.' });
    }

    const { diagnostico, tratamiento, observaciones } = validacion.data;
    const historialResult = await client.query(
      `INSERT INTO historial_atenciones (
         id_cita,
         diagnostico,
         tratamiento,
         observaciones,
         fecha_registro
       )
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (id_cita)
       DO UPDATE SET
         diagnostico = EXCLUDED.diagnostico,
         tratamiento = EXCLUDED.tratamiento,
         observaciones = EXCLUDED.observaciones,
         fecha_registro = CURRENT_TIMESTAMP
       RETURNING
         id_historial,
         id_cita,
         diagnostico,
         tratamiento,
         observaciones,
         fecha_registro`,
      [idCita, diagnostico, tratamiento, observaciones]
    );

    await client.query('COMMIT');
    return res.json({
      message: 'Historial clínico guardado correctamente.',
      historial: historialResult.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en guardarHistorialCitaMedico:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  } finally {
    client.release();
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
              ((c.fecha_cita + c.hora_cita) <= NOW()) AS cita_ocurrida,
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

    if (!cita.cita_ocurrida) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Solo se puede marcar asistencia cuando la cita ya ocurrió.' });
    }

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
         c.id_cita, c.id_paciente, c.fecha_cita, c.hora_cita, c.estado_cita, c.modalidad,
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
         AND  (fecha_cita + hora_cita) <= NOW()
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
         AND  (c.fecha_cita + c.hora_cita) > NOW()
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

/**
 * GET /api/medico/disponibilidad?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 * Devuelve los bloques de disponibilidad del médico autenticado en el rango de fechas dado.
 * Anti-IDOR: id_medico siempre se obtiene del JWT, nunca del query string.
 */
async function getDisponibilidad(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  const { desde, hasta } = req.query;

  if (!desde || !hasta) {
    return res.status(400).json({ message: 'Los parámetros desde y hasta son obligatorios.' });
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

    const result = await pool.query(
      `SELECT
         id_disponibilidad,
         fecha::text,
         hora_inicio::text,
         hora_fin::text,
         estado,
         observacion AS nota
       FROM disponibilidad_medica
       WHERE id_medico = $1
         AND fecha BETWEEN $2 AND $3
       ORDER BY fecha, hora_inicio`,
      [idMedico, desde, hasta]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error('Error en getDisponibilidad:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * POST /api/medico/disponibilidad
 * Crea uno o varios bloques de disponibilidad para el médico autenticado.
 * Body: { bloques: [{ fecha, hora_inicio, hora_fin, estado?, nota? }] }
 * Si un bloque ya existe (UNIQUE), se ignora silenciosamente.
 */
async function crearDisponibilidad(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  const { bloques } = req.body;

  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  if (!Array.isArray(bloques) || bloques.length === 0) {
    return res.status(400).json({ message: 'El campo bloques debe ser un arreglo con al menos un elemento.' });
  }

  if (bloques.length > MAX_BLOQUES_DISPONIBILIDAD) {
    return res.status(400).json({ message: `No se pueden crear más de ${MAX_BLOQUES_DISPONIBILIDAD} bloques por solicitud.` });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const medicoResult = await client.query(
      'SELECT id_medico FROM medicos WHERE id_usuario = $1 AND estado = $2',
      [idUsuario, 'activo']
    );
    if (medicoResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'No se encontró perfil de médico activo.' });
    }
    const idMedico = medicoResult.rows[0].id_medico;

    const creados = [];

    for (let i = 0; i < bloques.length; i += 1) {
      const bloque = bloques[i];
      const validacionBloque = validarBloqueDisponibilidad(bloque, { requerirFuturo: true });
      if (validacionBloque.error) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `Bloque ${i + 1}: ${validacionBloque.error}` });
      }

      const validacionNota = validarNotaDisponibilidad(bloque?.nota);
      if (validacionNota.error) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `Bloque ${i + 1}: ${validacionNota.error}` });
      }

      const { fecha, hora_inicio, hora_fin, estado } = validacionBloque.data;
      const tieneSolapamiento = await existeSolapamientoDisponibilidad(client, {
        idMedico,
        fecha,
        horaInicio: hora_inicio,
        horaFin: hora_fin,
      });

      if (tieneSolapamiento) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: `Bloque ${i + 1}: existe una disponibilidad que se solapa con ese rango horario.` });
      }

      const result = await client.query(
        `INSERT INTO disponibilidad_medica (id_medico, fecha, hora_inicio, hora_fin, estado, observacion)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id_medico, fecha, hora_inicio, hora_fin) DO NOTHING
         RETURNING id_disponibilidad, fecha::text, hora_inicio::text, hora_fin::text, estado, observacion AS nota`,
        [idMedico, fecha, hora_inicio, hora_fin, estado, validacionNota.data]
      );

      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: `Bloque ${i + 1}: ya existe una disponibilidad con ese mismo rango.` });
      }

      creados.push(result.rows[0]);
    }

    await client.query('COMMIT');
    return res.status(201).json(creados);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en crearDisponibilidad:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  } finally {
    client.release();
  }
}

/**
 * PATCH /api/medico/disponibilidad/:id
 * Actualiza estado u observacion de un bloque del médico autenticado.
 * No permite modificar bloques de otro médico (Anti-IDOR).
 */
async function actualizarDisponibilidad(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  const idDisponibilidad = parseInt(req.params.id, 10);
  const { estado, hora_inicio, hora_fin, nota } = req.body;

  if (isNaN(idUsuario) || isNaN(idDisponibilidad) || idDisponibilidad < 1) {
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

    // Verificar que el bloque pertenece al médico autenticado
    const bloqueResult = await pool.query(
      `SELECT
         d.fecha::text AS fecha,
         d.hora_inicio::text AS hora_inicio,
         d.hora_fin::text AS hora_fin,
         d.estado,
         EXISTS (
           SELECT 1
           FROM citas_medicas c
           WHERE c.id_disponibilidad = d.id_disponibilidad
             AND c.estado_cita IN ('pendiente', 'confirmada')
         ) AS tiene_cita_activa
       FROM disponibilidad_medica d
       WHERE d.id_disponibilidad = $1
         AND d.id_medico = $2`,
      [idDisponibilidad, idMedico]
    );
    if (bloqueResult.rowCount === 0) {
      return res.status(404).json({ message: 'Bloque no encontrado.' });
    }

    if (bloqueResult.rows[0].estado === 'reservada' || bloqueResult.rows[0].tiene_cita_activa) {
      return res.status(409).json({ message: 'No se puede modificar un bloque con cita reservada.' });
    }

    const bloqueActual = bloqueResult.rows[0];
    const actualizaRango = hora_inicio !== undefined || hora_fin !== undefined;
    let bloqueValidado = null;
    let notaValidada = null;

    if (estado !== undefined || actualizaRango) {
      const validacionBloque = validarBloqueDisponibilidad(
        {
          fecha: bloqueActual.fecha,
          hora_inicio: hora_inicio ?? bloqueActual.hora_inicio,
          hora_fin: hora_fin ?? bloqueActual.hora_fin,
          estado: estado ?? bloqueActual.estado,
        },
        { requerirFuturo: actualizaRango }
      );

      if (validacionBloque.error) {
        return res.status(400).json({ message: validacionBloque.error });
      }

      bloqueValidado = validacionBloque.data;

      if (actualizaRango) {
        const tieneSolapamiento = await existeSolapamientoDisponibilidad(pool, {
          idMedico,
          fecha: bloqueValidado.fecha,
          horaInicio: bloqueValidado.hora_inicio,
          horaFin: bloqueValidado.hora_fin,
          excluirId: idDisponibilidad,
        });

        if (tieneSolapamiento) {
          return res.status(409).json({ message: 'Existe una disponibilidad que se solapa con ese rango horario.' });
        }
      }
    }

    if (nota !== undefined) {
      const validacionNota = validarNotaDisponibilidad(nota);
      if (validacionNota.error) {
        return res.status(400).json({ message: validacionNota.error });
      }

      notaValidada = validacionNota.data;
    }

    const campos = [];
    const valores = [];
    let idx = 1;

    if (estado !== undefined) { campos.push(`estado = $${idx++}`); valores.push(bloqueValidado.estado); }
    if (hora_inicio !== undefined) { campos.push(`hora_inicio = $${idx++}`); valores.push(bloqueValidado.hora_inicio); }
    if (hora_fin !== undefined) { campos.push(`hora_fin = $${idx++}`); valores.push(bloqueValidado.hora_fin); }
    if (nota !== undefined) { campos.push(`observacion = $${idx++}`); valores.push(notaValidada); }

    if (campos.length === 0) {
      return res.status(400).json({ message: 'No se proporcionaron campos a actualizar.' });
    }

    valores.push(idDisponibilidad);

    const result = await pool.query(
      `UPDATE disponibilidad_medica
       SET ${campos.join(', ')}
       WHERE id_disponibilidad = $${idx}
       RETURNING id_disponibilidad, fecha::text, hora_inicio::text, hora_fin::text, estado, observacion AS nota`,
      valores
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error en actualizarDisponibilidad:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * DELETE /api/medico/disponibilidad/:id
 * Elimina un bloque de disponibilidad. Rechaza si tiene una cita reservada.
 * Anti-IDOR: verifica que el bloque pertenece al médico del JWT.
 */
async function eliminarDisponibilidad(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  const idDisponibilidad = parseInt(req.params.id, 10);

  if (isNaN(idDisponibilidad)) {
    return res.status(400).json({ message: 'ID de disponibilidad inválido.' });
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

    const bloqueResult = await pool.query(
      'SELECT estado FROM disponibilidad_medica WHERE id_disponibilidad = $1 AND id_medico = $2',
      [idDisponibilidad, idMedico]
    );
    if (bloqueResult.rowCount === 0) {
      return res.status(404).json({ message: 'Bloque no encontrado.' });
    }

    if (bloqueResult.rows[0].estado === 'reservada') {
      return res.status(409).json({ message: 'No se puede eliminar un bloque con cita reservada.' });
    }

    await pool.query(
      'DELETE FROM disponibilidad_medica WHERE id_disponibilidad = $1',
      [idDisponibilidad]
    );

    return res.json({ message: 'Bloque eliminado correctamente.' });
  } catch (err) {
    console.error('Error en eliminarDisponibilidad:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * PUT /api/medico/perfil
 * Actualiza datos personales del médico autenticado (tabla usuarios).
 * Campos editables: nombre, apellido, correo, telefono.
 * El número de registro, especialidad y años de experiencia no son auto-editables.
 * Anti-IDOR: id_usuario siempre del JWT.
 */
async function actualizarPerfilMedico(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  const { nombre, apellido, correo, telefono } = req.body;

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

  try {
    const correoNorm = correo.trim().toLowerCase();

    // Verificar que el correo no esté tomado por otro usuario
    const correoExistente = await pool.query(
      'SELECT 1 FROM usuarios WHERE correo = $1 AND id_usuario <> $2',
      [correoNorm, idUsuario]
    );
    if (correoExistente.rowCount > 0) {
      return res.status(409).json({ message: 'El correo ya está registrado por otro usuario.' });
    }

    await pool.query(
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

    return res.json({ message: 'Datos actualizados correctamente.' });
  } catch (err) {
    console.error('Error en actualizarPerfilMedico:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * POST /api/medico/perfil/foto
 * Guarda una foto de perfil persistente para el médico autenticado.
 */
async function subirFotoPerfilMedico(req, res) {
  const idUsuario = parseInt(req.user.id, 10);

  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'No se recibió ninguna imagen.' });
  }

  try {
    const nombreArchivo = req.file.filename;
    const rutaPublica = `/uploads/perfiles/${nombreArchivo}`;

    await pool.query(
      `UPDATE usuarios
       SET foto_perfil_url = $1,
           fecha_actualizacion = NOW()
       WHERE id_usuario = $2`,
      [rutaPublica, idUsuario]
    );

    return res.status(201).json({
      message: 'Foto de perfil actualizada correctamente.',
      foto_perfil_url: rutaPublica,
    });
  } catch (err) {
    // Si falla BD, elimina imagen huérfana.
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error('Error en subirFotoPerfilMedico:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * PATCH /api/medico/perfil/password
 * Cambia la contraseña del médico autenticado.
 * Requiere: { contrasena_actual, contrasena_nueva }
 * Anti-IDOR: id_usuario siempre del JWT.
 */
async function cambiarPasswordMedico(req, res) {
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
    const verificacion = await pool.query(
      `SELECT (contrasena_hash = crypt($1, contrasena_hash)) AS valid
       FROM usuarios WHERE id_usuario = $2`,
      [contrasena_actual, idUsuario]
    );

    if (verificacion.rowCount === 0 || !verificacion.rows[0].valid) {
      return res.status(401).json({ message: 'La contraseña actual es incorrecta.' });
    }

    await pool.query(
      `UPDATE usuarios
       SET contrasena_hash = crypt($1, gen_salt('bf', 12)),
           fecha_actualizacion = NOW()
       WHERE id_usuario = $2`,
      [contrasena_nueva, idUsuario]
    );

    return res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    console.error('Error en cambiarPasswordMedico:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

module.exports = {
  getDashboardMedico,
  getCitasParaMarcar,
  getCitasProximas,
  getDetalleCitaMedico,
  guardarHistorialCitaMedico,
  marcarAsistencia,
  getFichaPaciente,
  getPacientesMedico,
  getPerfilMedico,
  actualizarPerfilMedico,
  subirFotoPerfilMedico,
  cambiarPasswordMedico,
  getDisponibilidad,
  crearDisponibilidad,
  actualizarDisponibilidad,
  eliminarDisponibilidad,
  getNotificacionesMedico,
  actualizarEstadoNotificacionMedico,
  marcarNotificacionesLeidasMedico,
  limpiarNotificacionesMedico,
  eliminarNotificacionMedico,
};
