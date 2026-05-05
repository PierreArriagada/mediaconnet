/**
 * Job de auto-asignación de solicitudes de invitado.
 *
 * Se ejecuta cada 60 segundos. Busca citas de invitados con
 * estado_cita = 'pendiente' cuyo plazo de revisión admin ha vencido
 * (fecha_limite_asignacion <= NOW()) y las confirma automáticamente.
 *
 * El slot ya fue reservado al crear la solicitud, por lo que solo
 * se necesita cambiar el estado de la cita a 'confirmada'.
 *
 * Seguridad:
 *  - FOR UPDATE SKIP LOCKED: evita que dos ejecuciones simultáneas
 *    (reinicio del servidor durante el intervalo) procesen la misma fila.
 *  - BEGIN / COMMIT / ROLLBACK: la operación es atómica.
 *  - Errores capturados: el job no detiene el servidor.
 */

const pool = require('../db/pool');

async function ejecutarAutoAsignacion() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Bloquea solo las filas que se van a procesar, ignora las ya bloqueadas
    const resultado = await client.query(
      `SELECT id_cita, id_disponibilidad, nombre_invitado, apellido_invitado
       FROM citas_medicas
       WHERE es_invitado = TRUE
         AND estado_cita = 'pendiente'
         AND fecha_limite_asignacion IS NOT NULL
         AND fecha_limite_asignacion <= NOW()
       FOR UPDATE SKIP LOCKED`
    );

    if (resultado.rowCount === 0) {
      await client.query('ROLLBACK');
      return;
    }

    for (const cita of resultado.rows) {
      // Verificar que el slot sigue reservado (salvaguarda defensiva)
      if (cita.id_disponibilidad) {
        const slotCheck = await client.query(
          `SELECT estado FROM disponibilidad_medica WHERE id_disponibilidad = $1`,
          [cita.id_disponibilidad]
        );
        if (slotCheck.rowCount === 0 || slotCheck.rows[0].estado !== 'reservada') {
          // El slot fue liberado manualmente (caso anómalo); solo registramos y continuamos
          console.warn(
            `[Auto-asignación] Cita ${cita.id_cita}: slot ${cita.id_disponibilidad} ` +
            `no está en estado 'reservada'. Se confirma igualmente.`
          );
        }
      }

      await client.query(
        `UPDATE citas_medicas
         SET estado_cita = 'confirmada',
             fecha_limite_asignacion = NULL
         WHERE id_cita = $1`,
        [cita.id_cita]
      );

      console.log(
        `[Auto-asignación] Cita ${cita.id_cita} (${cita.nombre_invitado} ${cita.apellido_invitado}) ` +
        `confirmada automáticamente.`
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignorar error de rollback */ }
    console.error('[Auto-asignación] Error en ciclo:', err.message);
  } finally {
    client.release();
  }
}

/**
 * Inicia el job. Se llama una vez al arrancar el servidor.
 * Ejecuta inmediatamente y luego cada 60 segundos.
 */
function iniciarJobAutoAsignacion() {
  console.log('[Auto-asignación] Job iniciado (ciclo cada 60 segundos).');
  // Primera ejecución al arrancar (para no esperar 60s si ya había pendientes)
  ejecutarAutoAsignacion().catch((err) =>
    console.error('[Auto-asignación] Error en ejecución inicial:', err.message)
  );
  setInterval(() => {
    ejecutarAutoAsignacion().catch((err) =>
      console.error('[Auto-asignación] Error en ciclo periódico:', err.message)
    );
  }, 60_000);
}

module.exports = { iniciarJobAutoAsignacion };
