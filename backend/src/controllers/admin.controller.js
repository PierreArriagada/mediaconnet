const { parsePagination } = require('../utils/pagination');
const { isValidPassword } = require('../utils/password.utils');

function construirAccionNotificacionAdmin(notificacion) {
  const titulo = (notificacion.titulo ?? '').toLowerCase();
  const mensaje = notificacion.mensaje ?? '';

  if (!titulo.includes('solicitud de cita invitado')) {
    return null;
  }

  const match = mensaje.match(/Solicitud #(\d+)/);
  const entidadId = match ? parseInt(match[1], 10) : null;

  return {
    tipo: 'solicitud_invitado',
    entidadTipo: 'cita',
    entidadId: Number.isFinite(entidadId) ? entidadId : null,
    ruta: '/admin/operacion/solicitudes',
  };
}

const pool = require('../db/pool');

/**
 * GET /api/admin/notificaciones
 * Devuelve las notificaciones del administrador autenticado junto con el
 * conteo de no leídas para el badge.
 */
async function getNotificacionesAdmin(req, res) {
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
      notificaciones: notificacionesResult.rows.map((row) => ({
        ...row,
        accion: construirAccionNotificacionAdmin(row),
      })),
      noLeidas: parseInt(unreadResult.rows[0].total, 10),
      total: parseInt(totalResult.rows[0].total, 10),
      limit,
      offset,
    });
  } catch (err) {
    console.error('Error en getNotificacionesAdmin:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * PATCH /api/admin/notificaciones/:id/leida
 * Marca una notificación del administrador autenticado como leída o no leída.
 * Body opcional: { leida: boolean }
 */
async function actualizarEstadoNotificacionAdmin(req, res) {
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
    console.error('Error en actualizarEstadoNotificacionAdmin:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * GET /api/admin/notificaciones/contador
 * Devuelve solo el conteo de notificaciones no leídas del administrador.
 */
async function getContadorNotificacionesAdmin(req, res) {
  const idUsuario = parseInt(req.user.id, 10);

  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  try {
    const result = await pool.query(
      `SELECT COUNT(*) AS total
       FROM notificaciones
       WHERE id_usuario = $1 AND leida = FALSE`,
      [idUsuario]
    );

    return res.json({ noLeidas: parseInt(result.rows[0].total, 10) });
  } catch (err) {
    console.error('Error en getContadorNotificacionesAdmin:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * DELETE /api/admin/notificaciones/:id
 * Elimina una notificación perteneciente al administrador autenticado.
 */
async function eliminarNotificacionAdmin(req, res) {
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
    console.error('Error en eliminarNotificacionAdmin:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * GET /api/admin/medicos
 * Lista todos los médicos activos con nombre, apellido y especialidad.
 * Solo accesible por Administrador.
 */
async function getMedicos(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         m.id_medico,
         u.nombre,
         u.apellido,
         e.nombre_especialidad AS especialidad,
         m.estado
       FROM medicos m
       JOIN usuarios u ON u.id_usuario = m.id_usuario
       JOIN especialidades e ON e.id_especialidad = m.id_especialidad
       WHERE m.estado = 'activo'
       ORDER BY u.apellido, u.nombre`
    );

    return res.json({ medicos: result.rows });
  } catch (err) {
    console.error('Error en getMedicos (admin):', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * GET /api/admin/medicos/:id/disponibilidad?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 * Devuelve los bloques de disponibilidad de un médico específico en el rango dado.
 */
async function getDisponibilidadMedico(req, res) {
  const idMedico = parseInt(req.params.id, 10);
  const { desde, hasta } = req.query;

  if (isNaN(idMedico) || idMedico < 1) {
    return res.status(400).json({ message: 'ID de médico inválido.' });
  }
  if (!desde || !hasta) {
    return res.status(400).json({ message: 'Los parámetros desde y hasta son obligatorios.' });
  }

  try {
    const medicoCheck = await pool.query(
      'SELECT id_medico FROM medicos WHERE id_medico = $1 AND estado = $2',
      [idMedico, 'activo']
    );
    if (medicoCheck.rowCount === 0) {
      return res.status(404).json({ message: 'Médico no encontrado.' });
    }

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
    console.error('Error en getDisponibilidadMedico (admin):', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * POST /api/admin/medicos/:id/disponibilidad
 * Crea uno o varios bloques de disponibilidad para un médico específico.
 * Body: { bloques: [{ fecha, hora_inicio, hora_fin, estado?, nota? }] }
 */
async function crearDisponibilidadMedico(req, res) {
  const idMedico = parseInt(req.params.id, 10);
  const { bloques } = req.body;

  if (isNaN(idMedico) || idMedico < 1) {
    return res.status(400).json({ message: 'ID de médico inválido.' });
  }
  if (!Array.isArray(bloques) || bloques.length === 0) {
    return res.status(400).json({ message: 'El campo bloques debe ser un arreglo con al menos un elemento.' });
  }

  try {
    const medicoCheck = await pool.query(
      'SELECT id_medico FROM medicos WHERE id_medico = $1 AND estado = $2',
      [idMedico, 'activo']
    );
    if (medicoCheck.rowCount === 0) {
      return res.status(404).json({ message: 'Médico no encontrado.' });
    }

    const creados = [];

    for (const bloque of bloques) {
      const { fecha, hora_inicio, hora_fin, estado = 'disponible', nota = null } = bloque;

      if (!fecha || !hora_inicio || !hora_fin) {
        continue;
      }

      const result = await pool.query(
        `INSERT INTO disponibilidad_medica (id_medico, fecha, hora_inicio, hora_fin, estado, observacion)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id_medico, fecha, hora_inicio, hora_fin) DO NOTHING
         RETURNING id_disponibilidad, fecha::text, hora_inicio::text, hora_fin::text, estado, observacion AS nota`,
        [idMedico, fecha, hora_inicio, hora_fin, estado, nota]
      );

      if (result.rowCount > 0) {
        creados.push(result.rows[0]);
      }
    }

    return res.status(201).json(creados);
  } catch (err) {
    console.error('Error en crearDisponibilidadMedico (admin):', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * PATCH /api/admin/disponibilidad/:id
 * Actualiza el estado u horario de un bloque de disponibilidad.
 * Body: { fecha, hora_inicio, hora_fin, estado }
 */
async function actualizarDisponibilidadMedico(req, res) {
  const idDisponibilidad = parseInt(req.params.id, 10);
  const { fecha, hora_inicio, hora_fin, estado } = req.body;

  if (isNaN(idDisponibilidad) || idDisponibilidad < 1) {
    return res.status(400).json({ message: 'ID de bloque inválido.' });
  }
  if (!fecha || !hora_inicio || !hora_fin || !estado) {
    return res.status(400).json({ message: 'Campos fecha, hora_inicio, hora_fin y estado son obligatorios.' });
  }

  const estadosValidos = ['disponible', 'reservada', 'bloqueada'];
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ message: 'Estado inválido.' });
  }

  try {
    const result = await pool.query(
      `UPDATE disponibilidad_medica
       SET fecha = $1, hora_inicio = $2, hora_fin = $3, estado = $4
       WHERE id_disponibilidad = $5
       RETURNING id_disponibilidad, fecha::text, hora_inicio::text, hora_fin::text, estado, observacion AS nota`,
      [fecha, hora_inicio, hora_fin, estado, idDisponibilidad]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Bloque no encontrado.' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error en actualizarDisponibilidadMedico (admin):', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * DELETE /api/admin/disponibilidad/:id
 * Elimina un bloque de disponibilidad. No permite eliminar bloques 'reservada'.
 */
async function eliminarDisponibilidadMedico(req, res) {
  const idDisponibilidad = parseInt(req.params.id, 10);

  if (isNaN(idDisponibilidad) || idDisponibilidad < 1) {
    return res.status(400).json({ message: 'ID de bloque inválido.' });
  }

  try {
    const check = await pool.query(
      'SELECT estado FROM disponibilidad_medica WHERE id_disponibilidad = $1',
      [idDisponibilidad]
    );

    if (check.rowCount === 0) {
      return res.status(404).json({ message: 'Bloque no encontrado.' });
    }

    if (check.rows[0].estado === 'reservada') {
      return res.status(409).json({ message: 'No se puede eliminar un bloque con cita reservada.' });
    }

    await pool.query(
      'DELETE FROM disponibilidad_medica WHERE id_disponibilidad = $1',
      [idDisponibilidad]
    );

    return res.json({ message: 'Bloque eliminado correctamente.' });
  } catch (err) {
    console.error('Error en eliminarDisponibilidadMedico (admin):', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GESTIÓN DE MÉDICOS — backoffice administrador
// ─────────────────────────────────────────────────────────────────────────────

const ESTADOS_LABORALES_VALIDOS = [
  'activo',
  'vacaciones',
  'licencia_medica',
  'licencia_administrativa',
  'inactivo',
  'destituido',
];

/**
 * GET /api/admin/medicos/gestion
 * Lista todos los médicos (todos los estados) con filtros opcionales.
 * Query params: q (texto libre), especialidad (nombre), estado_laboral
 */
async function getMedicosGestion(req, res) {
  const { q, especialidad, estado_laboral } = req.query;

  const conditions = [];
  const values = [];
  let idx = 1;

  if (q) {
    conditions.push(
      `(LOWER(u.nombre) LIKE LOWER($${idx}) OR LOWER(u.apellido) LIKE LOWER($${idx}) OR LOWER(u.correo) LIKE LOWER($${idx}))`,
    );
    values.push(`%${q}%`);
    idx++;
  }

  if (especialidad) {
    conditions.push(`LOWER(e.nombre_especialidad) = LOWER($${idx})`);
    values.push(especialidad);
    idx++;
  }

  if (estado_laboral && ESTADOS_LABORALES_VALIDOS.includes(estado_laboral)) {
    conditions.push(`m.estado_laboral = $${idx}`);
    values.push(estado_laboral);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT
         m.id_medico,
         u.nombre,
         u.apellido,
         u.correo,
         u.telefono,
         u.estado           AS estado_sistema,
         e.nombre_especialidad AS especialidad,
         e.id_especialidad,
         m.numero_registro,
         m.anios_experiencia,
         m.estado           AS estado_medico,
         m.estado_laboral,
         m.valoracion_promedio,
         m.total_valoraciones,
         m.fecha_creacion,
         (
           SELECT COUNT(*) FROM citas_medicas c
           WHERE c.id_medico = m.id_medico
             AND c.estado_cita <> 'cancelada'
         ) AS total_citas,
         (
           SELECT COUNT(*) FROM citas_medicas c
           WHERE c.id_medico = m.id_medico
             AND c.fecha_cita >= CURRENT_DATE
             AND c.estado_cita <> 'cancelada'
         ) AS citas_futuras
       FROM medicos m
       JOIN usuarios u ON u.id_usuario = m.id_usuario
       JOIN especialidades e ON e.id_especialidad = m.id_especialidad
       ${where}
       ORDER BY u.apellido, u.nombre`,
      values,
    );

    return res.json({ medicos: result.rows });
  } catch (err) {
    console.error('Error en getMedicosGestion (admin):', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * GET /api/admin/medicos/:id/detalle
 * Devuelve el detalle completo de un médico para el backoffice.
 */
async function getMedicoDetalle(req, res) {
  const idMedico = parseInt(req.params.id, 10);

  if (isNaN(idMedico) || idMedico < 1) {
    return res.status(400).json({ message: 'ID de médico inválido.' });
  }

  try {
    const medicoRes = await pool.query(
      `SELECT
         m.id_medico,
         m.id_usuario,
         u.nombre,
         u.apellido,
         u.correo,
         u.telefono,
         u.estado           AS estado_sistema,
         u.fecha_registro,
         e.id_especialidad,
         e.nombre_especialidad AS especialidad,
         m.numero_registro,
         m.anios_experiencia,
         m.biografia,
         m.valoracion_promedio,
         m.total_valoraciones,
         m.estado           AS estado_medico,
         m.estado_laboral,
         m.fecha_creacion,
         m.fecha_actualizacion
       FROM medicos m
       JOIN usuarios u ON u.id_usuario = m.id_usuario
       JOIN especialidades e ON e.id_especialidad = m.id_especialidad
       WHERE m.id_medico = $1`,
      [idMedico],
    );

    if (medicoRes.rowCount === 0) {
      return res.status(404).json({ message: 'Médico no encontrado.' });
    }

    const citasRes = await pool.query(
      `SELECT
         c.id_cita,
         c.fecha_cita::text,
         c.hora_cita::text,
         c.estado_cita AS estado,
         c.modalidad,
         c.motivo_consulta,
         p.nombre AS paciente_nombre,
         p.apellido AS paciente_apellido
       FROM citas_medicas c
       LEFT JOIN pacientes pac ON pac.id_paciente = c.id_paciente
       LEFT JOIN usuarios p ON p.id_usuario = pac.id_usuario
       WHERE c.id_medico = $1
       ORDER BY c.fecha_cita DESC, c.hora_cita DESC
       LIMIT 20`,
      [idMedico],
    );

    return res.json({
      medico: medicoRes.rows[0],
      historial_citas: citasRes.rows,
    });
  } catch (err) {
    console.error('Error en getMedicoDetalle (admin):', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * POST /api/admin/medicos
 * Crea un nuevo médico generando usuario y perfil en una sola transacción.
 * Body: { nombre, apellido, correo, telefono, password_inicial,
 *         id_especialidad, numero_registro, anios_experiencia, biografia }
 */
async function crearMedico(req, res) {
  const {
    nombre,
    apellido,
    correo,
    telefono,
    password_inicial,
    id_especialidad,
    numero_registro,
    anios_experiencia = 0,
    biografia = null,
  } = req.body;

  if (!nombre || !apellido || !correo || !password_inicial || !id_especialidad || !numero_registro) {
    return res.status(400).json({
      message: 'Los campos nombre, apellido, correo, password_inicial, id_especialidad y numero_registro son obligatorios.',
    });
  }

  if (password_inicial.length < 8) {
    return res.status(400).json({ message: 'La contraseña inicial debe tener al menos 8 caracteres.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validar que id_especialidad exista y esté activa
    const espCheck = await client.query(
      "SELECT id_especialidad FROM especialidades WHERE id_especialidad = $1 AND estado = 'activa'",
      [id_especialidad],
    );
    if (espCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Especialidad inválida o inactiva.' });
    }

    // Crear usuario con rol Médico (id_rol = 3 según seed)
    const usuarioRes = await client.query(
      `INSERT INTO usuarios (nombre, apellido, correo, contrasena_hash, telefono, estado, id_rol)
       VALUES ($1, $2, $3, crypt($4, gen_salt('bf', 12)), $5, 'activo', 3)
       RETURNING id_usuario`,
      [nombre.trim(), apellido.trim(), correo.trim().toLowerCase(), password_inicial, telefono ?? null],
    );

    const idUsuario = usuarioRes.rows[0].id_usuario;

    // Crear perfil de médico
    const medicoRes = await client.query(
      `INSERT INTO medicos
         (id_usuario, id_especialidad, numero_registro, anios_experiencia, biografia, estado, estado_laboral)
       VALUES ($1, $2, $3, $4, $5, 'activo', 'activo')
       RETURNING id_medico`,
      [idUsuario, id_especialidad, numero_registro.trim(), anios_experiencia, biografia],
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Médico creado correctamente.',
      id_medico: medicoRes.rows[0].id_medico,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      if (err.constraint === 'uq_usuarios_correo') {
        return res.status(409).json({ message: 'El correo electrónico ya está registrado.' });
      }
      if (err.constraint === 'uq_medicos_numero_registro') {
        return res.status(409).json({ message: 'El número de registro médico ya existe.' });
      }
    }
    console.error('Error en crearMedico (admin):', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  } finally {
    client.release();
  }
}

/**
 * PUT /api/admin/medicos/:id/perfil
 * Edita los datos del médico y su usuario asociado.
 * Body: { nombre, apellido, correo, telefono, id_especialidad,
 *         numero_registro, anios_experiencia, biografia }
 */
async function editarPerfilMedico(req, res) {
  const idMedico = parseInt(req.params.id, 10);

  if (isNaN(idMedico) || idMedico < 1) {
    return res.status(400).json({ message: 'ID de médico inválido.' });
  }

  const {
    nombre,
    apellido,
    correo,
    telefono,
    id_especialidad,
    numero_registro,
    anios_experiencia,
    biografia,
  } = req.body;

  if (!nombre || !apellido || !correo || !id_especialidad || !numero_registro) {
    return res.status(400).json({
      message: 'Los campos nombre, apellido, correo, id_especialidad y numero_registro son obligatorios.',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Obtener id_usuario del médico
    const medicoCheck = await client.query(
      'SELECT id_usuario FROM medicos WHERE id_medico = $1',
      [idMedico],
    );
    if (medicoCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Médico no encontrado.' });
    }
    const idUsuario = medicoCheck.rows[0].id_usuario;

    // Validar especialidad activa
    const espCheck = await client.query(
      "SELECT id_especialidad FROM especialidades WHERE id_especialidad = $1 AND estado = 'activa'",
      [id_especialidad],
    );
    if (espCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Especialidad inválida o inactiva.' });
    }

    await client.query(
      `UPDATE usuarios
       SET nombre = $1, apellido = $2, correo = $3, telefono = $4, fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE id_usuario = $5`,
      [nombre.trim(), apellido.trim(), correo.trim().toLowerCase(), telefono ?? null, idUsuario],
    );

    await client.query(
      `UPDATE medicos
       SET id_especialidad = $1, numero_registro = $2, anios_experiencia = $3,
           biografia = $4, fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE id_medico = $5`,
      [id_especialidad, numero_registro.trim(), anios_experiencia ?? 0, biografia ?? null, idMedico],
    );

    await client.query('COMMIT');

    return res.json({ message: 'Perfil actualizado correctamente.' });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      if (err.constraint === 'uq_usuarios_correo') {
        return res.status(409).json({ message: 'El correo electrónico ya está registrado por otro usuario.' });
      }
      if (err.constraint === 'uq_medicos_numero_registro') {
        return res.status(409).json({ message: 'El número de registro médico ya existe.' });
      }
    }
    console.error('Error en editarPerfilMedico (admin):', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  } finally {
    client.release();
  }
}

/**
 * PATCH /api/admin/medicos/:id/estado-laboral
 * Cambia el estado laboral del médico con reglas de negocio.
 * Body: { nuevo_estado, motivo? }
 *
 * Reglas:
 *  destituido → medicos.estado = inactivo, usuarios.estado = bloqueado
 *  inactivo   → medicos.estado = inactivo
 *  activo     → medicos.estado = activo, usuarios.estado = activo
 *  resto      → solo cambia estado_laboral (médico sigue activo en sistema)
 *
 * Cascada: si el nuevo estado no es 'activo', las citas futuras pendientes o
 * confirmadas del médico se cancelan, sus slots se liberan y se notifica a
 * los pacientes afectados que tengan cuenta registrada.
 */
async function cambiarEstadoLaboral(req, res) {
  const idMedico = parseInt(req.params.id, 10);

  if (isNaN(idMedico) || idMedico < 1) {
    return res.status(400).json({ message: 'ID de médico inválido.' });
  }

  const { nuevo_estado, motivo } = req.body;

  if (!nuevo_estado || !ESTADOS_LABORALES_VALIDOS.includes(nuevo_estado)) {
    return res.status(400).json({
      message: `Estado laboral inválido. Valores permitidos: ${ESTADOS_LABORALES_VALIDOS.join(', ')}.`,
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const check = await client.query(
      'SELECT id_usuario, estado, estado_laboral FROM medicos WHERE id_medico = $1',
      [idMedico],
    );
    if (check.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Médico no encontrado.' });
    }

    const { id_usuario, estado_laboral: estadoActual } = check.rows[0];

    if (estadoActual === nuevo_estado) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'El médico ya tiene ese estado laboral.' });
    }

    // Actualizar estado_laboral en medicos
    await client.query(
      `UPDATE medicos
       SET estado_laboral = $1, fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE id_medico = $2`,
      [nuevo_estado, idMedico],
    );

    // Reglas de negocio sobre estado del sistema
    if (nuevo_estado === 'destituido') {
      await client.query(
        "UPDATE medicos SET estado = 'inactivo', fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_medico = $1",
        [idMedico],
      );
      await client.query(
        "UPDATE usuarios SET estado = 'bloqueado', fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_usuario = $1",
        [id_usuario],
      );
    } else if (nuevo_estado === 'inactivo') {
      await client.query(
        "UPDATE medicos SET estado = 'inactivo', fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_medico = $1",
        [idMedico],
      );
    } else if (nuevo_estado === 'activo') {
      // Reincorporación: reactiva en el sistema
      await client.query(
        "UPDATE medicos SET estado = 'activo', fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_medico = $1",
        [idMedico],
      );
      await client.query(
        "UPDATE usuarios SET estado = 'activo', fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_usuario = $1",
        [id_usuario],
      );
    }
    // vacaciones / licencia_medica / licencia_administrativa → solo estado_laboral cambia

    // ── Cascada: cancelar citas futuras si el médico deja de estar operativo ──
    let citasCanceladas = 0;
    if (nuevo_estado !== 'activo') {
      const citasFuturas = await client.query(
        `SELECT c.id_cita, c.id_disponibilidad, c.fecha_cita::text, c.hora_cita::text,
                pac.id_usuario AS id_usuario_paciente
         FROM citas_medicas c
         JOIN pacientes pac ON pac.id_paciente = c.id_paciente
         WHERE c.id_medico = $1
           AND c.estado_cita IN ('pendiente', 'confirmada')
           AND (c.fecha_cita + c.hora_cita) > NOW()`,
        [idMedico]
      );

      for (const cita of citasFuturas.rows) {
        // Cancelar la cita
        await client.query(
          `UPDATE citas_medicas SET estado_cita = 'cancelada' WHERE id_cita = $1`,
          [cita.id_cita]
        );

        // Liberar el slot de disponibilidad si existe
        if (cita.id_disponibilidad) {
          await client.query(
            `UPDATE disponibilidad_medica SET estado = 'disponible' WHERE id_disponibilidad = $1`,
            [cita.id_disponibilidad]
          );
        }

        // Notificar al paciente si tiene cuenta registrada
        if (cita.id_usuario_paciente) {
          await client.query(
            `INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
             VALUES ($1, 'Cita cancelada por el centro', $2, 'cancelacion', FALSE)`,
            [
              cita.id_usuario_paciente,
              `Tu cita del ${cita.fecha_cita} a las ${cita.hora_cita.substring(0, 5)} fue cancelada porque el profesional no estará disponible. Por favor reagenda con otro especialista.`,
            ]
          );
        }
      }

      citasCanceladas = citasFuturas.rowCount;
    }

    await client.query('COMMIT');

    return res.json({
      message: 'Estado laboral actualizado correctamente.',
      nuevo_estado,
      motivo: motivo ?? null,
      citas_canceladas: citasCanceladas,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en cambiarEstadoLaboral (admin):', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  } finally {
    client.release();
  }
}

/**
 * GET /api/admin/especialidades
 * Lista todas las especialidades para selectores del backoffice.
 */
async function getEspecialidades(req, res) {
  try {
    const result = await pool.query(
      `SELECT id_especialidad, nombre_especialidad, estado
       FROM especialidades
       ORDER BY nombre_especialidad`,
    );
    return res.json({ especialidades: result.rows });
  } catch (err) {
    console.error('Error en getEspecialidades (admin):', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GESTIÓN DE PACIENTES — backoffice administrador
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/pacientes
 * Lista todos los pacientes con datos básicos y estadísticas de citas.
 * Query params: q (texto libre en nombre, apellido, correo o RUT),
 *               estado (activo | inactivo | bloqueado)
 */
async function getPacientes(req, res) {
  const { q, estado } = req.query;

  const conditions = [];
  const values = [];
  let idx = 1;

  if (q && typeof q === 'string' && q.trim()) {
    const term = `%${q.trim()}%`;
    conditions.push(
      `(LOWER(u.nombre) LIKE LOWER($${idx})
        OR LOWER(u.apellido) LIKE LOWER($${idx})
        OR LOWER(u.correo) LIKE LOWER($${idx})
        OR LOWER(p.rut) LIKE LOWER($${idx}))`,
    );
    values.push(term);
    idx++;
  }

  const estadosPermitidos = ['activo', 'inactivo', 'bloqueado'];
  if (estado && estadosPermitidos.includes(estado)) {
    conditions.push(`u.estado = $${idx}`);
    values.push(estado);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT
         p.id_paciente,
         u.nombre,
         u.apellido,
         u.correo,
         u.telefono,
         u.estado          AS estado_cuenta,
         p.rut,
         p.fecha_nacimiento::text,
         p.ciudad,
         p.comuna,
         u.fecha_registro,
         (
           SELECT COUNT(*) FROM citas_medicas c
           WHERE c.id_paciente = p.id_paciente
             AND c.estado_cita <> 'cancelada'
         ) AS total_citas,
         (
           SELECT MAX(c.fecha_cita)::text FROM citas_medicas c
           WHERE c.id_paciente = p.id_paciente
             AND c.fecha_cita < CURRENT_DATE
             AND c.estado_cita = 'completada'
         ) AS ultima_cita,
         (
           SELECT MIN(c.fecha_cita)::text FROM citas_medicas c
           WHERE c.id_paciente = p.id_paciente
             AND c.fecha_cita >= CURRENT_DATE
             AND c.estado_cita IN ('pendiente', 'confirmada')
         ) AS proxima_cita
       FROM pacientes p
       JOIN usuarios u ON u.id_usuario = p.id_usuario
       ${where}
       ORDER BY u.apellido, u.nombre`,
      values,
    );

    return res.json({ pacientes: result.rows });
  } catch (err) {
    console.error('Error en getPacientes (admin):', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * GET /api/admin/pacientes/:id
 * Devuelve la ficha completa de un paciente con su historial de citas.
 */
async function getPacienteDetalle(req, res) {
  const idPaciente = parseInt(req.params.id, 10);

  if (isNaN(idPaciente) || idPaciente < 1) {
    return res.status(400).json({ message: 'ID de paciente inválido.' });
  }

  try {
    const pacienteRes = await pool.query(
      `SELECT
         p.id_paciente,
         p.id_usuario,
         u.nombre,
         u.apellido,
         u.correo,
         u.telefono,
         u.estado          AS estado_cuenta,
         u.fecha_registro,
         p.rut,
         p.fecha_nacimiento::text,
         p.direccion,
         p.comuna,
         p.ciudad,
         p.contacto_emergencia,
         p.telefono_emergencia,
         p.fecha_creacion,
         p.fecha_actualizacion
       FROM pacientes p
       JOIN usuarios u ON u.id_usuario = p.id_usuario
       WHERE p.id_paciente = $1`,
      [idPaciente],
    );

    if (pacienteRes.rowCount === 0) {
      return res.status(404).json({ message: 'Paciente no encontrado.' });
    }

    const citasRes = await pool.query(
      `SELECT
         c.id_cita,
         c.fecha_cita::text,
         c.hora_cita::text,
         c.estado_cita       AS estado,
         c.modalidad,
         c.motivo_consulta,
         c.observaciones,
         c.es_invitado,
         c.confirmada_asistencia,
         c.asistio_cita,
         e.nombre_especialidad AS especialidad,
         u.nombre             AS medico_nombre,
         u.apellido           AS medico_apellido,
         m.id_medico,
         CASE WHEN ha.id_historial IS NOT NULL THEN TRUE ELSE FALSE END AS tiene_historial
       FROM citas_medicas c
       JOIN medicos m ON m.id_medico = c.id_medico
       JOIN usuarios u ON u.id_usuario = m.id_usuario
       JOIN especialidades e ON e.id_especialidad = c.id_especialidad
       LEFT JOIN historial_atenciones ha ON ha.id_cita = c.id_cita
       WHERE c.id_paciente = $1
       ORDER BY c.fecha_cita DESC, c.hora_cita DESC`,
      [idPaciente],
    );

    return res.json({
      paciente: pacienteRes.rows[0],
      citas: citasRes.rows,
    });
  } catch (err) {
    console.error('Error en getPacienteDetalle (admin):', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * GET /api/admin/citas/:id
 * Devuelve el detalle completo de una cita incluyendo historial de atención si existe.
 */
async function getCitaDetalle(req, res) {
  const idCita = parseInt(req.params.id, 10);

  if (isNaN(idCita) || idCita < 1) {
    return res.status(400).json({ message: 'ID de cita inválido.' });
  }

  try {
    const citaRes = await pool.query(
      `SELECT
         c.id_cita,
         c.fecha_cita::text,
         c.hora_cita::text,
         c.estado_cita           AS estado,
         c.modalidad,
         c.motivo_consulta,
         c.observaciones,
         c.es_invitado,
         c.confirmada_asistencia,
         c.asistio_cita,
         c.nombre_invitado,
         c.apellido_invitado,
         c.correo_invitado,
         c.telefono_invitado,
         c.fecha_creacion,
         c.fecha_actualizacion,
         -- Paciente
         pac.id_paciente,
         up.nombre             AS paciente_nombre,
         up.apellido           AS paciente_apellido,
         up.correo             AS paciente_correo,
         up.telefono           AS paciente_telefono,
         pac.rut               AS paciente_rut,
         -- Médico
         m.id_medico,
         um.nombre             AS medico_nombre,
         um.apellido           AS medico_apellido,
         um.correo             AS medico_correo,
         um.telefono           AS medico_telefono,
         m.numero_registro     AS medico_registro,
         m.anios_experiencia   AS medico_experiencia,
         -- Especialidad
         e.id_especialidad,
         e.nombre_especialidad AS especialidad
       FROM citas_medicas c
       JOIN pacientes pac ON pac.id_paciente = c.id_paciente
       JOIN usuarios up ON up.id_usuario = pac.id_usuario
       JOIN medicos m ON m.id_medico = c.id_medico
       JOIN usuarios um ON um.id_usuario = m.id_usuario
       JOIN especialidades e ON e.id_especialidad = c.id_especialidad
       WHERE c.id_cita = $1`,
      [idCita],
    );

    if (citaRes.rowCount === 0) {
      return res.status(404).json({ message: 'Cita no encontrada.' });
    }

    const historialRes = await pool.query(
      `SELECT
         ha.id_historial,
         ha.diagnostico,
         ha.tratamiento,
         ha.observaciones    AS notas_historial,
         ha.fecha_registro
       FROM historial_atenciones ha
       WHERE ha.id_cita = $1`,
      [idCita],
    );

    return res.json({
      cita: citaRes.rows[0],
      historial: historialRes.rowCount > 0 ? historialRes.rows[0] : null,
    });
  } catch (err) {
    console.error('Error en getCitaDetalle (admin):', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GESTIÓN DE SOLICITUDES DE INVITADO — backoffice administrador
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/solicitudes
 * Lista todas las solicitudes de invitado con estado 'pendiente' y plazo activo.
 * Incluye tiempo_restante_seg para que el frontend muestre la cuenta regresiva.
 */
async function getSolicitudes(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         c.id_cita,
         c.nombre_invitado,
         c.apellido_invitado,
         c.correo_invitado,
         c.telefono_invitado,
         c.motivo_consulta,
         c.fecha_creacion,
         c.fecha_limite_asignacion,
         EXTRACT(EPOCH FROM (c.fecha_limite_asignacion - NOW()))::int AS tiempo_restante_seg,
         c.fecha_cita::text,
         c.hora_cita::text,
         c.id_disponibilidad,
         e.nombre_especialidad AS especialidad,
         u.nombre              AS medico_nombre,
         u.apellido            AS medico_apellido,
         m.id_medico
       FROM citas_medicas c
       JOIN especialidades e ON e.id_especialidad = c.id_especialidad
       JOIN medicos m         ON m.id_medico = c.id_medico
       JOIN usuarios u        ON u.id_usuario = m.id_usuario
       WHERE c.es_invitado = TRUE
         AND c.estado_cita = 'pendiente'
         AND c.fecha_limite_asignacion IS NOT NULL
       ORDER BY c.fecha_limite_asignacion ASC`
    );
    return res.json({ solicitudes: result.rows });
  } catch (err) {
    console.error('Error en getSolicitudes (admin):', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * GET /api/admin/solicitudes/:id/alternativas
 * Devuelve médicos activos de la misma especialidad con su próximo slot disponible.
 * El frontend lo usa para el selector de reasignación.
 */
async function getSolicitudAlternativas(req, res) {
  const idCita = parseInt(req.params.id, 10);
  if (isNaN(idCita) || idCita < 1) {
    return res.status(400).json({ message: 'ID de solicitud inválido.' });
  }

  try {
    // Obtener especialidad de la solicitud
    const citaRes = await pool.query(
      `SELECT id_especialidad FROM citas_medicas
       WHERE id_cita = $1 AND es_invitado = TRUE AND estado_cita = 'pendiente'`,
      [idCita]
    );
    if (citaRes.rowCount === 0) {
      return res.status(404).json({ message: 'Solicitud no encontrada o ya procesada.' });
    }

    const { id_especialidad } = citaRes.rows[0];

    // Para cada médico activo de la especialidad, devolver sus próximos 5 slots disponibles
    const medicosRes = await pool.query(
      `SELECT
         m.id_medico,
         u.nombre,
         u.apellido,
         m.anios_experiencia,
         COALESCE(
           json_agg(
             json_build_object(
               'id_disponibilidad', d.id_disponibilidad,
               'fecha', d.fecha::text,
               'hora_inicio', d.hora_inicio::text,
               'hora_fin', d.hora_fin::text
             ) ORDER BY d.fecha, d.hora_inicio
           ) FILTER (WHERE d.id_disponibilidad IS NOT NULL),
           '[]'
         ) AS slots
       FROM medicos m
       JOIN usuarios u ON u.id_usuario = m.id_usuario
       LEFT JOIN LATERAL (
         SELECT id_disponibilidad, fecha, hora_inicio, hora_fin
         FROM disponibilidad_medica
         WHERE id_medico = m.id_medico
           AND estado = 'disponible'
           AND (fecha > CURRENT_DATE OR (fecha = CURRENT_DATE AND hora_inicio > CURRENT_TIME))
         ORDER BY fecha ASC, hora_inicio ASC
         LIMIT 5
       ) d ON TRUE
       WHERE m.id_especialidad = $1
         AND m.estado = 'activo'
         AND m.estado_laboral = 'activo'
       GROUP BY m.id_medico, u.nombre, u.apellido, m.anios_experiencia
       ORDER BY u.apellido, u.nombre`,
      [id_especialidad]
    );

    return res.json({ medicos: medicosRes.rows });
  } catch (err) {
    console.error('Error en getSolicitudAlternativas (admin):', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * PATCH /api/admin/solicitudes/:id/confirmar
 * El admin confirma la asignación sugerida por el sistema.
 * Cambia estado_cita → 'confirmada' y limpia fecha_limite_asignacion.
 * Notifica al médico asignado y al paciente (si tiene cuenta registrada).
 * Usa FOR UPDATE para evitar condición de carrera con el job.
 */
async function confirmarSolicitud(req, res) {
  const idCita = parseInt(req.params.id, 10);
  if (isNaN(idCita) || idCita < 1) {
    return res.status(400).json({ message: 'ID de solicitud inválido.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const citaRes = await client.query(
      `SELECT c.id_cita, c.id_disponibilidad,
              c.fecha_cita::text, c.hora_cita::text,
              c.nombre_invitado, c.apellido_invitado,
              um.id_usuario AS id_usuario_medico,
              um.nombre     AS medico_nombre,
              um.apellido   AS medico_apellido,
              pac.id_usuario AS id_usuario_paciente
       FROM citas_medicas c
       JOIN medicos   m   ON m.id_medico  = c.id_medico
       JOIN usuarios  um  ON um.id_usuario = m.id_usuario
       JOIN pacientes pac ON pac.id_paciente = c.id_paciente
       WHERE c.id_cita = $1
         AND c.es_invitado = TRUE
         AND c.estado_cita = 'pendiente'
         AND c.fecha_limite_asignacion IS NOT NULL
       FOR UPDATE OF c`,
      [idCita]
    );

    if (citaRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Solicitud no encontrada o ya procesada.' });
    }

    const cita = citaRes.rows[0];

    await client.query(
      `UPDATE citas_medicas
       SET estado_cita = 'confirmada',
           fecha_limite_asignacion = NULL
       WHERE id_cita = $1`,
      [idCita]
    );

    // Notificar al médico asignado
    await client.query(
      `INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
       VALUES ($1, 'Cita de invitado confirmada', $2, 'confirmacion', FALSE)`,
      [
        cita.id_usuario_medico,
        `La solicitud #${idCita} de ${cita.nombre_invitado} ${cita.apellido_invitado} fue confirmada para el ${cita.fecha_cita} a las ${cita.hora_cita.substring(0, 5)}.`,
      ]
    );

    // Notificar al paciente solo si tiene cuenta registrada
    if (cita.id_usuario_paciente) {
      await client.query(
        `INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
         VALUES ($1, 'Solicitud confirmada', $2, 'confirmacion', FALSE)`,
        [
          cita.id_usuario_paciente,
          `Tu solicitud de cita fue confirmada con ${cita.medico_nombre} ${cita.medico_apellido} para el ${cita.fecha_cita} a las ${cita.hora_cita.substring(0, 5)}.`,
        ]
      );
    }

    await client.query('COMMIT');
    return res.json({ message: 'Solicitud confirmada correctamente.' });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignorar */ }
    console.error('Error en confirmarSolicitud (admin):', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  } finally {
    client.release();
  }
}

/**
 * PATCH /api/admin/solicitudes/:id/reasignar
 * El admin elige un slot diferente al sugerido.
 * Body: { id_disponibilidad: number }
 * - Libera el slot anterior (→ 'disponible')
 * - Reserva el nuevo slot (→ 'reservada') con FOR UPDATE
 * - Actualiza la cita y la confirma en un solo commit
 * - Notifica al médico reasignado y al paciente (si tiene cuenta)
 */
async function reasignarSolicitud(req, res) {
  const idCita = parseInt(req.params.id, 10);
  const idNuevoSlot = parseInt(req.body?.id_disponibilidad, 10);

  if (isNaN(idCita) || idCita < 1) {
    return res.status(400).json({ message: 'ID de solicitud inválido.' });
  }
  if (isNaN(idNuevoSlot) || idNuevoSlot < 1) {
    return res.status(400).json({ message: 'ID de disponibilidad inválido.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Bloquear la cita y leer el slot actual + datos del invitado/paciente
    const citaRes = await client.query(
      `SELECT c.id_cita, c.id_disponibilidad AS id_slot_actual,
              c.nombre_invitado, c.apellido_invitado,
              pac.id_usuario AS id_usuario_paciente
       FROM citas_medicas c
       JOIN pacientes pac ON pac.id_paciente = c.id_paciente
       WHERE c.id_cita = $1
         AND c.es_invitado = TRUE
         AND c.estado_cita = 'pendiente'
         AND c.fecha_limite_asignacion IS NOT NULL
       FOR UPDATE OF c`,
      [idCita]
    );
    if (citaRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Solicitud no encontrada o ya procesada.' });
    }

    const cita = citaRes.rows[0];
    const idSlotActual = cita.id_slot_actual;

    // Bloquear y verificar el nuevo slot + datos del médico destino
    const nuevoSlotRes = await client.query(
      `SELECT d.id_disponibilidad, d.id_medico,
              d.fecha::text, d.hora_inicio::text, d.hora_fin::text, d.estado,
              um.id_usuario AS id_usuario_medico,
              um.nombre     AS medico_nombre,
              um.apellido   AS medico_apellido
       FROM disponibilidad_medica d
       JOIN medicos  m  ON m.id_medico   = d.id_medico
       JOIN usuarios um ON um.id_usuario = m.id_usuario
       WHERE d.id_disponibilidad = $1
       FOR UPDATE OF d`,
      [idNuevoSlot]
    );
    if (nuevoSlotRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Slot de disponibilidad no encontrado.' });
    }
    if (nuevoSlotRes.rows[0].estado !== 'disponible') {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'El slot seleccionado ya no está disponible.' });
    }

    const nuevoSlot = nuevoSlotRes.rows[0];

    // Liberar slot anterior si existía
    if (idSlotActual && idSlotActual !== idNuevoSlot) {
      await client.query(
        `UPDATE disponibilidad_medica SET estado = 'disponible' WHERE id_disponibilidad = $1`,
        [idSlotActual]
      );
    }

    // Reservar nuevo slot
    await client.query(
      `UPDATE disponibilidad_medica SET estado = 'reservada' WHERE id_disponibilidad = $1`,
      [idNuevoSlot]
    );

    // Actualizar la cita y confirmarla
    await client.query(
      `UPDATE citas_medicas
       SET id_disponibilidad = $1,
           id_medico = $2,
           fecha_cita = $3,
           hora_cita = $4,
           estado_cita = 'confirmada',
           fecha_limite_asignacion = NULL
       WHERE id_cita = $5`,
      [idNuevoSlot, nuevoSlot.id_medico, nuevoSlot.fecha, nuevoSlot.hora_inicio, idCita]
    );

    // Notificar al médico reasignado
    await client.query(
      `INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
       VALUES ($1, 'Cita de invitado reasignada', $2, 'confirmacion', FALSE)`,
      [
        nuevoSlot.id_usuario_medico,
        `Se le reasignó la solicitud #${idCita} de ${cita.nombre_invitado} ${cita.apellido_invitado} para el ${nuevoSlot.fecha} a las ${nuevoSlot.hora_inicio.substring(0, 5)}.`,
      ]
    );

    // Notificar al paciente solo si tiene cuenta registrada
    if (cita.id_usuario_paciente) {
      await client.query(
        `INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
         VALUES ($1, 'Solicitud confirmada', $2, 'confirmacion', FALSE)`,
        [
          cita.id_usuario_paciente,
          `Tu solicitud de cita fue confirmada con ${nuevoSlot.medico_nombre} ${nuevoSlot.medico_apellido} para el ${nuevoSlot.fecha} a las ${nuevoSlot.hora_inicio.substring(0, 5)}.`,
        ]
      );
    }

    await client.query('COMMIT');
    return res.json({ message: 'Solicitud reasignada y confirmada correctamente.' });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignorar */ }
    console.error('Error en reasignarSolicitud (admin):', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  } finally {
    client.release();
  }
}

/**
 * GET /api/admin/perfil
 * Devuelve los datos del administrador autenticado junto con estadísticas
 * del sistema: médicos activos y alertas no leídas.
 * Anti-IDOR: id_usuario se extrae exclusivamente del JWT.
 */
async function getPerfilAdmin(req, res) {
  const idUsuario = parseInt(req.user.id, 10);

  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  try {
    const [usuarioRes, medicosRes, alertasRes] = await Promise.all([
      pool.query(
        `SELECT nombre, apellido, correo, telefono, estado, fecha_registro
         FROM usuarios
         WHERE id_usuario = $1`,
        [idUsuario],
      ),
      pool.query(
        `SELECT COUNT(*) AS total
         FROM medicos
         WHERE estado = 'activo' AND estado_laboral = 'activo'`,
      ),
      pool.query(
        `SELECT COUNT(*) AS total
         FROM notificaciones
         WHERE id_usuario = $1 AND leida = FALSE`,
        [idUsuario],
      ),
    ]);

    if (usuarioRes.rowCount === 0) {
      return res.status(404).json({ message: 'Perfil del administrador no encontrado.' });
    }

    return res.json({
      perfil: {
        ...usuarioRes.rows[0],
        medicos_activos: parseInt(medicosRes.rows[0].total, 10),
        alertas: parseInt(alertasRes.rows[0].total, 10),
      },
    });
  } catch (err) {
    console.error('Error en getPerfilAdmin:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * PUT /api/admin/perfil
 * Actualiza datos personales del administrador autenticado.
 * Campos editables: nombre, apellido, correo, telefono.
 * Anti-IDOR: id_usuario siempre del JWT.
 */
async function actualizarPerfilAdmin(req, res) {
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
    console.error('Error en actualizarPerfilAdmin:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * PATCH /api/admin/perfil/password
 * Cambia la contraseña del administrador autenticado.
 * Requiere: { contrasena_actual, contrasena_nueva }
 * Anti-IDOR: id_usuario siempre del JWT.
 */
async function cambiarPasswordAdmin(req, res) {
  const idUsuario = parseInt(req.user.id, 10);
  if (isNaN(idUsuario)) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  const { contrasena_actual, contrasena_nueva } = req.body;

  if (!contrasena_actual || typeof contrasena_actual !== 'string') {
    return res.status(400).json({ message: 'Contraseña actual requerida.' });
  }
  if (!isValidPassword(contrasena_nueva)) {
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
    console.error('Error en cambiarPasswordAdmin:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * DELETE /api/admin/notificaciones
 * Elimina todas las notificaciones del administrador autenticado.
 */
async function limpiarNotificacionesAdmin(req, res) {
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
    console.error('Error en limpiarNotificacionesAdmin:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * PATCH /api/admin/notificaciones/marcar-leidas
 * Marca todas las notificaciones no leídas del administrador autenticado como leídas.
 */
async function marcarNotificacionesLeidasAdmin(req, res) {
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
    console.error('Error en marcarNotificacionesLeidasAdmin:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

module.exports = {
  getMedicos,
  getDisponibilidadMedico,
  crearDisponibilidadMedico,
  actualizarDisponibilidadMedico,
  eliminarDisponibilidadMedico,
  // gestión de médicos
  getMedicosGestion,
  getMedicoDetalle,
  crearMedico,
  editarPerfilMedico,
  cambiarEstadoLaboral,
  getEspecialidades,
  // gestión de pacientes
  getPacientes,
  getPacienteDetalle,
  getCitaDetalle,
  // gestión de solicitudes de invitado
  getSolicitudes,
  getSolicitudAlternativas,
  confirmarSolicitud,
  reasignarSolicitud,
  // notificaciones admin
  getNotificacionesAdmin,
  getContadorNotificacionesAdmin,
  actualizarEstadoNotificacionAdmin,
  eliminarNotificacionAdmin,
  limpiarNotificacionesAdmin,
  marcarNotificacionesLeidasAdmin,
  // perfil admin
  getPerfilAdmin,
  actualizarPerfilAdmin,
  cambiarPasswordAdmin,
};
