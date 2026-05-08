* **Documento:** Detalle de cita del modulo profesional.
* **Ruta frontend:** `/medico/citas/:idCita`.
* **Objetivo:** Permitir que el profesional consulte una cita propia y registre el cierre clinico basico de la atencion.

## Alcance actual

La vista carga el detalle con `GET /api/medico/cita/:idCita`. El backend deriva `id_medico` desde el JWT y solo devuelve la cita si pertenece al profesional autenticado.

La pantalla muestra paciente, especialidad, fecha, hora, modalidad, estado, asistencia, motivo y observaciones administrativas. Desde la misma vista se puede abrir la ficha del paciente.

El formulario clinico guarda diagnostico, tratamiento y observaciones mediante `PUT /api/medico/cita/:idCita/historial`. El backend valida pertenencia, bloquea citas futuras, permite solo citas confirmadas o completadas y escribe en `historial_atenciones` con `UPSERT` por `id_cita`.

## Reglas importantes

- El cliente no envia ni controla `id_medico`.
- La escritura del historial exige que la cita ya haya ocurrido.
- Una cita puede tener un solo registro de historial; guardar de nuevo actualiza el registro existente.
- Los documentos clinicos siguen fuera de alcance hasta definir almacenamiento persistente, metadatos, permisos y visibilidad para paciente/profesional.

## Dependencias

- `backend/src/controllers/medico.controller.js`
- `backend/src/routes/medico.routes.js`
- `app/src/app/core/services/medico.service.ts`
- `app/src/app/features/medico/citas/citas.page.ts`
- `app/src/app/features/medico/citas/citas.page.html`
