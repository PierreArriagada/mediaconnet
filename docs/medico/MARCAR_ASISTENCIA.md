# Marcado de asistencia por el médico

## Qué se realizó
* Implementación del flujo completo de marcado de asistencia médica: el doctor registra si el paciente asistió o no a la cita, y el paciente ve ese resultado en su historial y detalle de cita.

## Base de datos
* **Qué se modificó:** Se agregó la columna `asistio_cita BOOLEAN DEFAULT NULL` en la tabla `citas_medicas`.
* **Ubicación:** `database/01_init.sql` — columna agregada en la definición de la tabla.
* **Migración:** Se ejecutó `ALTER TABLE citas_medicas ADD COLUMN asistio_cita BOOLEAN DEFAULT NULL` en la BD en ejecución.
* **Diferencia con `confirmada_asistencia`:** `confirmada_asistencia` es la pre-confirmación del paciente (24h antes). `asistio_cita` es el registro del doctor post-visita.

## Backend

### Nuevo módulo médico
* **Qué se realizó:** Creación del controlador y rutas del módulo médico.
* **Archivos creados:**
  * `backend/src/controllers/medico.controller.js` — controlador con 4 funciones
  * `backend/src/routes/medico.routes.js` — rutas protegidas con `requireAuth` + `requireRole('Medico')`
* **Qué se modificó:**
  * `backend/src/server.js` — se registró `medicoRoutes` en `/api/medico`

### Endpoints nuevos
* `GET /api/medico/dashboard` — resumen del médico: citas de hoy, pendientes de marcar, próxima cita futura, notificaciones no leídas.
* `GET /api/medico/citas-hoy` — citas pasadas o de hoy del médico (confirmadas y completadas) con estado de asistencia.
* `GET /api/medico/citas-proximas` — citas futuras confirmadas del médico.
* `PATCH /api/medico/cita/:idCita/marcar-asistencia` — el médico marca si el paciente asistió (`asistio: true`) o no (`asistio: false`). Cambia `estado_cita` a `completada` y notifica al paciente.

### Seguridad de los endpoints
* Protección JWT + rol `Medico` en todas las rutas.
* Anti-IDOR: el `id_medico` se resuelve desde el JWT, nunca del cliente.
* `FOR UPDATE` en la cita para evitar condiciones de carrera al marcar asistencia.
* Validación estricta: `asistio` debe ser booleano; no se puede marcar dos veces.

### Queries del paciente actualizadas
* **Qué se modificó:** `backend/src/controllers/paciente.controller.js`
  * `getHistorialCitas` ahora incluye `c.asistio_cita` en el SELECT.
  * `getDetalleCita` ahora incluye `c.asistio_cita` en el SELECT.

## Frontend

### Nuevo módulo médico
* **Qué se realizó:** Creación del módulo de médico con vista home para marcar asistencia.
* **Archivos creados:**
  * `app/src/app/features/medico/medico.routes.ts` — rutas del módulo médico con lazy loading.
  * `app/src/app/features/medico/home/medico-home.page.ts` — página principal del médico con tabs (hoy/próximas), tarjetas de citas y botones de marcar asistencia.
  * `app/src/app/features/medico/home/medico-home.page.html` — template con header propio, tarjetas resumen, grid de citas y botones "Asistió" / "No asistió".
  * `app/src/app/features/medico/home/medico-home.page.scss` — estilos siguiendo el sistema de diseño de MediConnect.
  * `app/src/app/core/services/medico.service.ts` — servicio HTTP para los endpoints del médico.

### Vista del médico — funcionalidad
* Header con nombre, avatar de estetoscopio y botón de cerrar sesión.
* Tarjetas resumen: cantidad de citas pendientes de marcar y citas de hoy.
* Tarjeta de próxima cita futura con datos del paciente.
* Tabs: "Citas pasadas / hoy" y "Próximas".
* Cada tarjeta muestra: paciente, especialidad, fecha, hora, modalidad, motivo, pre-confirmación del paciente.
* Botones "Asistió" (verde) y "No asistió" (rojo) con modal de confirmación antes de ejecutar.
* Badge visual en citas ya marcadas: "Asistió" o "No asistió".

### Paciente — historial actualizado
* **Qué se modificó:**
  * `app/src/app/core/services/paciente.service.ts` — interfaz `CitaHistorial` ahora incluye `asistio_cita: boolean | null`. Interfaz `DetalleCita` ahora incluye `asistio_cita: boolean | null`.
  * `app/src/app/features/paciente/historial/historial.page.ts` — `badgeEstado()` ahora muestra "Asistió" (verde) o "No asistió" (rojo) para citas completadas con asistencia marcada.
  * `app/src/app/features/paciente/historial/historial.page.scss` — nuevos estilos para badges `--asistio` y `--no-asistio`.
  * `app/src/app/features/paciente/citas/cita-detalle.page.ts` — `estadoSimple` ahora muestra estado diferenciado para citas completadas con asistencia marcada por el doctor.

### Routing y redirección por rol
* **Qué se modificó:**
  * `app/src/app/app.routes.ts` — nueva ruta `/medico` con lazy loading de `MEDICO_ROUTES`, protegida por `authGuard`.
  * `app/src/app/features/dashboard/dashboard.page.ts` — `ngOnInit()` ahora redirige automáticamente: `Paciente` → `/paciente/home`, `Medico` → `/medico/home`. Solo `Administrador` ve el dashboard genérico.

## Flujo completo de asistencia

1. El paciente reserva una cita → `estado_cita = 'confirmada'`.
2. 24h antes, el paciente puede pre-confirmar su asistencia → `confirmada_asistencia = true`.
3. Llega la hora de la cita y el paciente asiste (o no).
4. El médico entra a su panel → ve las citas pasadas pendientes de marcar.
5. El médico pulsa "Asistió" o "No asistió" → `asistio_cita = true/false`, `estado_cita = 'completada'`.
6. Se genera notificación para el paciente informando el resultado.
7. El paciente ve en su historial el badge "Asistió" o "No asistió" y en el detalle de la cita el estado correspondiente.

## Credenciales de prueba para el médico
* `medico1@mediconnect.cl` / `mediconnect2026` — Dr. Carlos Rojas (Medicina General)
* `medico2@mediconnect.cl` / `mediconnect2026` — Dra. Valentina Pérez (Dermatología)
