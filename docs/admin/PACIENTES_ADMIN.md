# Gestión de Pacientes del Administrador

## Qué se realizó
- Se implementó el flujo administrativo de pacientes bajo `/admin/pacientes` con consumo real de `/api/admin`.
- La vista principal lista pacientes registrados y soporta búsqueda por nombre, apellido, correo o RUT, además de filtro por estado de cuenta.
- La ficha administrativa del paciente expone dos pestañas: `Ficha` y `Citas`, con separación entre citas futuras y pasadas.
- El detalle individual de cita dentro del flujo de pacientes muestra datos del paciente o invitado, médico tratante, especialidad, estado, asistencia y `historial_atenciones` cuando existe.
- La navegación de retorno desde el detalle de cita preserva el contexto de la pestaña `citas` mediante `queryParam`.
- El formateo de fechas visibles en las vistas nuevas usa `Intl` y helpers locales, evitando `DatePipe` con locale `es-CL` para no depender de `registerLocaleData`.

## Archivos creados
- `app/src/app/features/admin/pacientes/pacientes-list.page.ts` — carga listado con `AdminService.getPacientes()`, aplica filtros `q` y `estado`, resuelve badges de cuenta y navega al detalle.
- `app/src/app/features/admin/pacientes/pacientes-list.page.html` — buscador, filtro por estado, cards con RUT, correo, total de citas, última cita y próxima cita.
- `app/src/app/features/admin/pacientes/pacientes-list.page.scss` — estilos del listado con prefijo `pl-` y tokens `--mc-*`.
- `app/src/app/features/admin/pacientes/paciente-detalle.page.ts` — carga ficha y citas del paciente, restaura pestaña por query param, separa futuras/pasadas y navega al detalle individual de cita.
- `app/src/app/features/admin/pacientes/paciente-detalle.page.html` — hero del paciente, métricas, pestañas, ficha administrativa y timeline de citas futuras/pasadas.
- `app/src/app/features/admin/pacientes/paciente-detalle.page.scss` — estilos del detalle con prefijo `pd-`.
- `app/src/app/features/admin/pacientes/cita-detalle.page.ts` — carga el detalle administrativo de una cita, permite volver a la ficha del paciente y enlaza a la ficha del médico.
- `app/src/app/features/admin/pacientes/cita-detalle.page.html` — hero de la cita, motivo de consulta, bloque de paciente o invitado, bloque del médico, asistencia e historial clínico.
- `app/src/app/features/admin/pacientes/cita-detalle.page.scss` — estilos del detalle de cita con prefijo `cd-`.
- `app/src/app/features/admin/pacientes/pacientes.routes.ts` — árbol lazy del flujo `/admin/pacientes`.

## Archivos modificados
- `app/src/app/features/admin/admin.routes.ts` — añade la rama lazy `pacientes` al módulo admin.
- `app/src/app/core/services/admin.service.ts` — agrega interfaces `PacienteListItem`, `PacienteDetalle`, `CitaPacienteItem`, `CitaAdminDetalle`, `HistorialAtencion` y métodos `getPacientes()`, `getPacienteDetalle()` y `getCitaDetalle()`.
- `backend/src/routes/admin.routes.js` — registra `GET /pacientes`, `GET /pacientes/:id` y `GET /citas/:id` bajo JWT + `requireRole('Administrador')`.
- `backend/src/controllers/admin.controller.js` — incorpora `getPacientes`, `getPacienteDetalle` y `getCitaDetalle` con joins reales sobre `usuarios`, `pacientes`, `medicos`, `especialidades`, `citas_medicas` e `historial_atenciones`.

## Endpoints implementados

### GET `/api/admin/pacientes`
- Query params opcionales: `q` y `estado`.
- `q` busca en `usuarios.nombre`, `usuarios.apellido`, `usuarios.correo` y `pacientes.rut`.
- Retorna métricas operativas por paciente: `total_citas`, `ultima_cita` y `proxima_cita`.

### GET `/api/admin/pacientes/:id`
- Devuelve `{ paciente, citas }`.
- `paciente` consolida datos de `usuarios` y `pacientes` para la ficha administrativa.
- `citas` incluye médico tratante, especialidad, modalidad, observaciones, asistencia y flag `tiene_historial`.

### GET `/api/admin/citas/:id`
- Devuelve `{ cita, historial }`.
- `cita` incluye contexto completo de paciente, invitado, médico y especialidad.
- `historial` entrega diagnóstico, tratamiento, notas y fecha de registro; cuando no existe, responde `null`.

## Comportamiento funcional
- `/admin/pacientes` funciona como listado operativo de soporte y supervisión; hoy no incluye edición ni acciones destructivas.
- `/admin/pacientes/:id` expone la ficha administrativa del paciente y su historial operativo de citas en una sola vista.
- `/admin/pacientes/:id/citas/:idCita` profundiza la revisión administrativa de una cita individual y permite saltar a `/admin/medicos/:id`.
- Las citas invitado se distinguen en el detalle individual mostrando los datos capturados en la reserva y un aviso visual específico.

## Límites actuales
- No existe todavía una operación global de citas administrativas con filtros sobre todo el sistema; el detalle individual vive dentro del flujo de pacientes.
- La vista no expone acciones de soporte sobre cuentas de paciente ni edición de información clínica sensible.
- No se integró auditoría persistente para este flujo, por lo que el módulo sigue siendo de consulta administrativa.