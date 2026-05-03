const pool = require('../db/pool');

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
             AND c.estado NOT IN ('cancelada_paciente','cancelada_admin')
         ) AS total_citas,
         (
           SELECT COUNT(*) FROM citas_medicas c
           WHERE c.id_medico = m.id_medico
             AND c.fecha_cita >= CURRENT_DATE
             AND c.estado NOT IN ('cancelada_paciente','cancelada_admin')
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
         c.estado,
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

    await client.query('COMMIT');

    return res.json({
      message: 'Estado laboral actualizado correctamente.',
      nuevo_estado,
      motivo: motivo ?? null,
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
};
