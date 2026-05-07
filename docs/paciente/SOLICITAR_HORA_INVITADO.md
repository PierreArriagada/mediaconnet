# Vista: Solicitar Hora (Invitado)

## Módulo
`features/auth/solicitar-hora`

---

## Qué se realizó

* Creación de la vista pública `SolicitarHoraPage` accesible desde el botón "Continuar como invitado" de la pantalla de login, sin requerir autenticación.
* Implementación de formulario reactivo de múltiples secciones para que un usuario no registrado pueda solicitar una cita médica.
* Creación del servicio `CitasService` en `core/services` para consumir los endpoints públicos del backend.
* Creación del controlador `citas.controller.js` y las rutas `citas.routes.js` en el backend para gestionar especialidades y solicitudes de cita invitado.
* Montaje de las nuevas rutas bajo `/api/citas` en `server.js`.

---

## Estado actual validado - 2026-05-07

El flujo vigente ya no pide fecha preferente ni franja horaria al invitado. El formulario público solicita datos personales, especialidad y motivo de consulta; luego el backend busca el slot disponible más cercano para médicos activos de esa especialidad y lo reserva de inmediato como solicitud pendiente de revisión.

---

## Qué se modificó

* **`auth.routes.ts`:** Se agregó la ruta `solicitar-hora` con carga diferida apuntando al nuevo componente.
* **`login.page.ts`:** El método `navigateAsGuest()` ahora redirige a `/auth/solicitar-hora` en lugar del dashboard.
* **`server.js`:** Se importó y montó `citasRoutes` bajo el prefijo `/api/citas`.

---

## Estructura del formulario

* **Datos Personales:** Nombre, apellidos, RUT (con validación módulo 11 y autoformato), fecha de nacimiento, teléfono y correo electrónico.
* **Detalle de Consulta:** Selector de especialidad (cargado dinámicamente desde la base de datos) y área de texto para el motivo de consulta.
* **Asignación de Agenda:** No hay selector de fecha ni franja en el formulario actual. La fecha y hora se asignan en backend usando la disponibilidad real más cercana.

---

## Lógica de backend para cita invitado

* `GET /api/citas/especialidades` — Ruta pública. Devuelve especialidades activas desde la tabla `especialidades`.
* `POST /api/citas/invitado` — Ruta pública. Flujo transaccional:
  * Busca paciente existente por RUT en la tabla `pacientes`; si no existe, crea un registro con `id_usuario = NULL`.
  * Busca el primer slot futuro disponible para un médico con `m.estado = 'activo'` y `m.estado_laboral = 'activo'`.
  * La `fecha_cita` y `hora_cita` se copian desde el slot reservado en `disponibilidad_medica`.
  * Inserta la cita con `estado_cita = 'pendiente'`, `es_invitado = TRUE`, campos de invitado y `fecha_limite_asignacion = NOW() + INTERVAL '2 hours'`.
  * Responde con 422 si no hay disponibilidad futura para la especialidad.

---

## Seguridad aplicada

* Validación y sanitización de todos los campos con `express-validator` antes de cualquier operación en base de datos.
* Consultas parametrizadas (`pool.query` con `$n`) para prevenir inyección SQL.
* Transacción de base de datos con `BEGIN / COMMIT / ROLLBACK` para garantizar consistencia.
* Validación de RUT chileno con algoritmo módulo 11 en frontend. La auditoría de código del 2026-05-07 detectó que backend aún debe canonicalizar y validar el RUT con la misma fuerza antes de persistir.
* Límites de longitud en cada campo para prevenir ataques de payload masivo.
* Pantalla de confirmación de éxito que reemplaza el formulario al completar el envío, evitando reenvíos accidentales.

---

## Pantalla de éxito

* Al completar el envío correctamente, el formulario es reemplazado por una tarjeta de confirmación con ícono, mensaje de respuesta y botón de regreso al login.

---

## Actualización — Vinculación automática por RUT al registrarse

### Qué se realizó
* Se implementó la vinculación automática entre solicitudes de invitado y cuentas nuevas usando el RUT como identificador único.
* Al registrarse, si el RUT ingresado corresponde a un paciente invitado existente (`id_usuario IS NULL`), ese registro se actualiza con el nuevo `id_usuario` en lugar de crear uno duplicado.
* Las citas enviadas como invitado quedan visibles inmediatamente al iniciar sesión con la cuenta recién creada.

### Qué se modificó
* **`backend/src/controllers/auth.controller.js`:** La función `register` ahora acepta `rut` como campo requerido; verifica que el RUT no esté ya vinculado a otra cuenta; busca paciente invitado por RUT y hace `UPDATE` si lo encuentra, `INSERT` si no.
* **`backend/src/routes/auth.routes.js`:** El validador de `rut` pasó de `optional` a `notEmpty()` requerido.
* **`app/src/app/core/services/auth.service.ts`:** `rut` en la interfaz `RegisterPayload` cambió de `string?` a `string` requerido.
* **`app/src/app/features/auth/register/register.page.ts`:** El `rutValidator` retorna `{ required: true }` cuando el campo está vacío; el payload siempre incluye `rut`.
* **`app/src/app/features/auth/register/register.page.html`:** La etiqueta del campo RUT eliminó el texto "(opcional)" y se agregó el error de campo requerido.

---

## Estilos

* Implementación con tokens `--mc-*` del sistema de diseño del proyecto (sin Tailwind).
* Nomenclatura BEM con prefijo `sh-` (solicitar-hora).
* Panel editorial con titular de gran escala visible solo en escritorio (`lg`).
* Barra de navegación inferior con glassmorphism visible solo en móvil.
* Selector de franja horaria con tarjetas visuales interactivas que muestran estado activo con borde primario y fondo `primary-fixed`.
