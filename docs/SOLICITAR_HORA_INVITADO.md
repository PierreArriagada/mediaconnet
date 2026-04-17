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

## Qué se modificó

* **`auth.routes.ts`:** Se agregó la ruta `solicitar-hora` con carga diferida apuntando al nuevo componente.
* **`login.page.ts`:** El método `navigateAsGuest()` ahora redirige a `/auth/solicitar-hora` en lugar del dashboard.
* **`server.js`:** Se importó y montó `citasRoutes` bajo el prefijo `/api/citas`.

---

## Estructura del formulario

* **Datos Personales:** Nombre, apellidos, RUT (con validación módulo 11 y autoformato), fecha de nacimiento, teléfono y correo electrónico.
* **Detalle de Consulta:** Selector de especialidad (cargado dinámicamente desde la base de datos) y área de texto para el motivo de consulta.
* **Preferencia de Agenda:** Selector de fecha (mínimo la fecha actual) y selector visual de franja horaria (mañana / tarde).

---

## Lógica de backend para cita invitado

* `GET /api/citas/especialidades` — Ruta pública. Devuelve especialidades activas desde la tabla `especialidades`.
* `POST /api/citas/invitado` — Ruta pública. Flujo transaccional:
  * Busca paciente existente por RUT en la tabla `pacientes`; si no existe, crea un registro con `id_usuario = NULL`.
  * Auto-asigna el primer médico activo disponible para la especialidad indicada.
  * La `hora_cita` se establece según la franja seleccionada: mañana → 09:00, tarde → 14:00.
  * Inserta la cita con `estado_cita = 'pendiente'`, `es_invitado = TRUE` y los campos de invitado correspondientes.
  * Responde con 422 si no hay médicos activos para la especialidad.

---

## Seguridad aplicada

* Validación y sanitización de todos los campos con `express-validator` antes de cualquier operación en base de datos.
* Consultas parametrizadas (`pool.query` con `$n`) para prevenir inyección SQL.
* Transacción de base de datos con `BEGIN / COMMIT / ROLLBACK` para garantizar consistencia.
* Validación de RUT chileno con algoritmo módulo 11 tanto en frontend como en el backend.
* Límites de longitud en cada campo para prevenir ataques de payload masivo.
* Pantalla de confirmación de éxito que reemplaza el formulario al completar el envío, evitando reenvíos accidentales.

---

## Pantalla de éxito

* Al completar el envío correctamente, el formulario es reemplazado por una tarjeta de confirmación con ícono, mensaje de respuesta y botón de regreso al login.

---

## Estilos

* Implementación con tokens `--mc-*` del sistema de diseño del proyecto (sin Tailwind).
* Nomenclatura BEM con prefijo `sh-` (solicitar-hora).
* Panel editorial con titular de gran escala visible solo en escritorio (`lg`).
* Barra de navegación inferior con glassmorphism visible solo en móvil.
* Selector de franja horaria con tarjetas visuales interactivas que muestran estado activo con borde primario y fondo `primary-fixed`.
