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

module.exports = {
  getMedicos,
  getDisponibilidadMedico,
  crearDisponibilidadMedico,
  actualizarDisponibilidadMedico,
  eliminarDisponibilidadMedico,
};
