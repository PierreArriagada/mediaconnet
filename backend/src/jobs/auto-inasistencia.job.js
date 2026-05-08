/**
 * Job de auto-inasistencia.
 *
 * Se ejecuta cada 5 minutos. Busca citas con:
 *   - estado_cita = 'confirmada'
 *   - asistio_cita IS NULL  (asistencia aún no registrada por el médico)
 *   - (fecha_cita + hora_cita) < NOW() - INTERVAL '15 minutes'
 *
 * Para cada una:
 *   - Establece asistio_cita = FALSE y estado_cita = 'completada'.
 *   - Notifica al paciente si tiene cuenta de usuario registrada.
 *
 * Solo actúa sobre citas 'confirmadas'. Las citas 'pendientes' que vencen
 * son responsabilidad del admin (no es una inasistencia del paciente si
 * la cita nunca fue confirmada).
 *
 * Seguridad:
 *  - FOR UPDATE OF c SKIP LOCKED: evita que dos ejecuciones simultáneas
 *    (reinicio del servidor durante el intervalo) procesen la misma fila.
 *  - BEGIN / COMMIT / ROLLBACK: la operación es atómica.
 *  - Errores capturados: el job no detiene el servidor.
 */

const pool = require('../db/pool');

async function ejecutarAutoInasistencia() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Bloquea solo las filas que se van a procesar, ignora las ya bloqueadas
    const resultado = await client.query(
      `SELECT
         c.id_cita,
         c.fecha_cita,
         p.id_usuario AS id_usuario_paciente
       FROM   citas_medicas c
       JOIN   pacientes     p ON c.id_paciente = p.id_paciente
       WHERE  c.estado_cita  = 'confirmada'
         AND  c.asistio_cita IS NULL
         AND  (c.fecha_cita + c.hora_cita) < NOW() - INTERVAL '15 minutes'
       FOR UPDATE OF c SKIP LOCKED`
    );

    if (resultado.rowCount === 0) {
      await client.query('ROLLBACK');
      return;
    }

    for (const cita of resultado.rows) {
      // Marcar como inasistencia y cerrar la cita
      await client.query(
        `UPDATE citas_medicas
         SET asistio_cita = FALSE,
             estado_cita  = 'completada'
         WHERE id_cita = $1`,
        [cita.id_cita]
      );

      // Notificar solo a pacientes con cuenta registrada (invitados sin cuenta no tienen id_usuario)
      if (cita.id_usuario_paciente !== null) {
        await client.query(
          `INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
           VALUES ($1,
                   'Inasistencia registrada',
                   'Tu cita médica del ' || to_char($2::date, 'DD/MM/YYYY') ||
                   ' fue registrada automáticamente como inasistencia al no haber sido atendida.',
                   'general',
                   FALSE)`,
          [cita.id_usuario_paciente, cita.fecha_cita]
        );
      }

      console.log(
        `[Auto-inasistencia] Cita ${cita.id_cita} marcada como inasistencia automáticamente.`
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignorar error de rollback */ }
    console.error('[Auto-inasistencia] Error en ciclo:', err.message);
  } finally {
    client.release();
  }
}

/**
 * Inicia el job. Se llama una vez al arrancar el servidor.
 * Ejecuta inmediatamente y luego cada 5 minutos.
 */
function iniciarJobAutoInasistencia() {
  console.log('[Auto-inasistencia] Job iniciado (ciclo cada 5 minutos).');
  // Primera ejecución al arrancar (para no esperar si ya había citas vencidas)
  ejecutarAutoInasistencia().catch((err) =>
    console.error('[Auto-inasistencia] Error en ejecución inicial:', err.message)
  );
  setInterval(() => {
    ejecutarAutoInasistencia().catch((err) =>
      console.error('[Auto-inasistencia] Error en ciclo periódico:', err.message)
    );
  }, 5 * 60 * 1000);
}

module.exports = { iniciarJobAutoInasistencia };
