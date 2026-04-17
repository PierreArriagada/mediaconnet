const { validationResult } = require('express-validator');
const pool = require('../db/pool');

/**
 * GET /api/citas/especialidades
 * Retorna todas las especialidades activas. Ruta pública (no requiere JWT).
 */
async function getEspecialidades(req, res) {
  try {
    const result = await pool.query(
      `SELECT id_especialidad, nombre_especialidad, descripcion
       FROM   especialidades
       WHERE  estado = 'activa'
       ORDER  BY nombre_especialidad ASC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo especialidades:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

/**
 * POST /api/citas/invitado
 * Crea una solicitud de cita para un usuario no registrado (invitado).
 * - Busca o crea el registro en pacientes por RUT (id_usuario = NULL).
 * - Auto-asigna el primer médico activo de la especialidad.
 * - hora_cita se fija según franja: mañana = 09:00, tarde = 14:00.
 * Ruta pública — no requiere JWT.
 */
async function crearCitaInvitado(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Datos inválidos.' });
  }

  const {
    nombre,
    apellido,
    rut,
    telefono,
    correo,
    fecha_nacimiento,
    id_especialidad,
    motivo_consulta,
    fecha_preferente,
    franja_horaria,
  } = req.body;

  // Hora preferida según franja seleccionada
  const hora_cita = franja_horaria === 'tarde' ? '14:00:00' : '09:00:00';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Buscar paciente existente por RUT para reutilizar el registro
    let idPaciente;
    const existingPaciente = await client.query(
      'SELECT id_paciente FROM pacientes WHERE rut = $1',
      [rut]
    );

    if (existingPaciente.rowCount > 0) {
      idPaciente = existingPaciente.rows[0].id_paciente;
    } else {
      // Crear nuevo paciente invitado sin cuenta de usuario asociada
      const nuevoPaciente = await client.query(
        `INSERT INTO pacientes (id_usuario, rut, fecha_nacimiento)
         VALUES (NULL, $1, $2)
         RETURNING id_paciente`,
        [rut, fecha_nacimiento]
      );
      idPaciente = nuevoPaciente.rows[0].id_paciente;
    }

    // Obtener primer médico activo de la especialidad para asignación automática
    const medicoResult = await client.query(
      `SELECT id_medico FROM medicos
       WHERE  id_especialidad = $1 AND estado = 'activo'
       ORDER  BY id_medico ASC
       LIMIT  1`,
      [id_especialidad]
    );

    if (medicoResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(422).json({
        message: 'No hay médicos disponibles para la especialidad seleccionada.',
      });
    }

    const idMedico = medicoResult.rows[0].id_medico;

    // Insertar cita con estado pendiente y campos de invitado
    const citaResult = await client.query(
      `INSERT INTO citas_medicas (
         id_paciente, id_medico, id_especialidad,
         modalidad, fecha_cita, hora_cita, estado_cita, motivo_consulta,
         es_invitado, nombre_invitado, apellido_invitado,
         correo_invitado, telefono_invitado
       ) VALUES ($1, $2, $3, 'presencial', $4, $5, 'pendiente', $6,
                 TRUE, $7, $8, $9, $10)
       RETURNING id_cita`,
      [
        idPaciente, idMedico, id_especialidad,
        fecha_preferente, hora_cita, motivo_consulta,
        nombre, apellido, correo, telefono,
      ]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Solicitud registrada correctamente. Nos contactaremos a la brevedad.',
      id_cita: citaResult.rows[0].id_cita,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creando cita invitado:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  } finally {
    client.release();
  }
}

module.exports = { getEspecialidades, crearCitaInvitado };
