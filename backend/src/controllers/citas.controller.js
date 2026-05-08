const { validationResult } = require('express-validator');
const pool = require('../db/pool');
const { normalizeRut } = require('../utils/rut');

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
 * Nuevo flujo (2026-05):
 *   - El invitado elige solo la especialidad (no fecha ni médico).
 *   - El sistema busca el slot disponible más próximo entre todos los
 *     médicos activos de esa especialidad y lo reserva de inmediato.
 *   - Se registra fecha_limite_asignacion = NOW() + 2 horas.
 *   - Si el admin no actúa en ese plazo, el job de auto-asignación
 *     confirma la cita automáticamente.
 *   - Se notifica a todos los usuarios con rol Administrador.
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
  } = req.body;

  const rutNormalizado = normalizeRut(rut);
  if (!rutNormalizado) {
    return res.status(400).json({ message: 'RUT inválido.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Buscar o crear paciente invitado por RUT ──────────────────
    let idPaciente;
    const existingPaciente = await client.query(
      `SELECT id_paciente, rut
       FROM   pacientes
       WHERE  REPLACE(REPLACE(REPLACE(UPPER(rut), '.', ''), '-', ''), ' ', '') = REPLACE($1, '-', '')
       ORDER  BY id_usuario IS NULL ASC, id_paciente ASC
       LIMIT  1
       FOR UPDATE`,
      [rutNormalizado]
    );

    if (existingPaciente.rowCount > 0) {
      idPaciente = existingPaciente.rows[0].id_paciente;
      if (existingPaciente.rows[0].rut !== rutNormalizado) {
        await client.query(
          'UPDATE pacientes SET rut = $1, fecha_actualizacion = NOW() WHERE id_paciente = $2',
          [rutNormalizado, idPaciente]
        );
      }
    } else {
      const nuevoPaciente = await client.query(
        `INSERT INTO pacientes (id_usuario, rut, fecha_nacimiento)
         VALUES (NULL, $1, $2)
         RETURNING id_paciente`,
        [rutNormalizado, fecha_nacimiento]
      );
      idPaciente = nuevoPaciente.rows[0].id_paciente;
    }

    // ── 2. Encontrar el slot disponible más cercano de la especialidad ─
    // Se usa FOR UPDATE para bloquear la fila y evitar doble reserva.
    const slotResult = await client.query(
      `SELECT d.id_disponibilidad, d.id_medico, d.fecha::text, d.hora_inicio::text, d.hora_fin::text, m.id_usuario AS id_usuario_medico
       FROM disponibilidad_medica d
       JOIN medicos m ON m.id_medico = d.id_medico
       WHERE m.id_especialidad = $1
         AND m.estado = 'activo'
         AND m.estado_laboral = 'activo'
         AND d.estado = 'disponible'
         AND (
           d.fecha > CURRENT_DATE
           OR (d.fecha = CURRENT_DATE AND d.hora_inicio > CURRENT_TIME)
         )
       ORDER BY d.fecha ASC, d.hora_inicio ASC
       LIMIT 1
       FOR UPDATE OF d`,
      [id_especialidad]
    );

    if (slotResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(422).json({
        message: 'No hay disponibilidad para la especialidad seleccionada en este momento.',
      });
    }

    const slot = slotResult.rows[0];

    // ── 3. Reservar el slot encontrado ───────────────────────────────
    await client.query(
      `UPDATE disponibilidad_medica SET estado = 'reservada' WHERE id_disponibilidad = $1`,
      [slot.id_disponibilidad]
    );

    // ── 4. Crear la cita con plazo de 2 horas para revisión admin ────
    const citaResult = await client.query(
      `INSERT INTO citas_medicas (
         id_paciente, id_medico, id_especialidad, id_disponibilidad,
         modalidad, fecha_cita, hora_cita, estado_cita, motivo_consulta,
         es_invitado, nombre_invitado, apellido_invitado,
         correo_invitado, telefono_invitado, fecha_limite_asignacion
       ) VALUES ($1, $2, $3, $4, 'presencial', $5, $6, 'pendiente', $7,
                 TRUE, $8, $9, $10, $11, NOW() + INTERVAL '2 hours')
       RETURNING id_cita`,
      [
        idPaciente, slot.id_medico, id_especialidad, slot.id_disponibilidad,
        slot.fecha, slot.hora_inicio, motivo_consulta,
        nombre, apellido, correo, telefono,
      ]
    );

    // ── 5. Notificar a todos los administradores ─────────────────────
    const adminsResult = await client.query(
      `SELECT u.id_usuario FROM usuarios u
       JOIN roles r ON r.id_rol = u.id_rol
       WHERE r.nombre_rol = 'Administrador' AND u.estado = 'activo'`
    );

    for (const admin of adminsResult.rows) {
      await client.query(
        `INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
         VALUES ($1, $2, $3, 'general', FALSE)`,
        [
          admin.id_usuario,
          'Nueva solicitud de cita invitado',
          `Solicitud #${citaResult.rows[0].id_cita} — ${nombre} ${apellido} necesita revisión. Se confirmará automáticamente en 2 horas si no se actúa.`,
        ]
      );
    }

    // Notificar al médico pre-asignado
    await client.query(
      `INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
       VALUES ($1, 'Solicitud de invitado pre-asignada', 'Se ha pre-asignado la solicitud #' || $2 || ' de un invitado en tu agenda. Queda pendiente de confirmación administrativa.', 'general', FALSE)`,
      [slot.id_usuario_medico, citaResult.rows[0].id_cita]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Solicitud registrada. Un médico fue pre-asignado y el equipo la revisará a la brevedad.',
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
