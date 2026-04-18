# Flujo de Reserva de Citas — Fase 3

## Detalle Profesional, Elegir Horario y Confirmar Reserva

---

### Qué se realizó
* Creación de tres nuevas vistas para completar el flujo de reserva de citas del módulo paciente:
  - **Detalle Profesional**: muestra perfil completo del médico (avatar, nombre, especialidad, registro, experiencia) con sidebar lateral de próximos horarios disponibles agrupados por fecha y seleccionables.
  - **Elegir Horario**: calendario mensual interactivo que resalta únicamente los días con disponibilidad; al seleccionar un día muestra los bloques horarios separados en mañana/tarde.
  - **Confirmar Reserva**: formulario final de confirmación con resumen visual del médico, fecha y hora seleccionados; permite elegir modalidad (presencial/telemedicina), escribir motivo de consulta (3–255 caracteres) y enviar la reserva.
* Creación de tres nuevos endpoints en el backend para soportar las vistas:
  - `GET /api/paciente/medico/:idMedico` — detalle del médico con próximas 10 disponibilidades.
  - `GET /api/paciente/medico/:idMedico/disponibilidad` — disponibilidad completa futura del médico para el calendario.
  - `POST /api/paciente/reservar` — crea la cita médica con transacción, bloqueo pesimista del slot (`FOR UPDATE`), marca disponibilidad como reservada y genera notificación de confirmación.
* Creación de interfaces y métodos en el servicio Angular para consumir los nuevos endpoints.
* Registro de las tres nuevas rutas lazy-loaded en el módulo de paciente.

### Qué se modificó

* **`backend/src/controllers/paciente.controller.js`**
  - Se agregaron tres funciones: `getDetalleMedico`, `getDisponibilidadMedico`, `crearCitaPaciente`.
  - Se actualizó el `module.exports` para incluir las tres nuevas funciones.

* **`backend/src/routes/paciente.routes.js`**
  - Se importaron las tres nuevas funciones del controlador.
  - Se registraron tres nuevas rutas: `GET /medico/:idMedico`, `GET /medico/:idMedico/disponibilidad`, `POST /reservar`.

* **`app/src/app/core/services/paciente.service.ts`**
  - Se agregaron interfaces: `DetalleMedicoData`, `DisponibilidadMedicoData`, `CrearCitaPayload`, `CrearCitaResponse`.
  - Se agregaron métodos: `getDetalleMedico()`, `getDisponibilidadMedico()`, `crearCita()`.

* **`app/src/app/features/paciente/paciente.routes.ts`**
  - Se agregaron tres nuevas rutas lazy-loaded: `detalle-profesional/:idMedico`, `elegir-horario/:idMedico`, `confirmar-reserva/:idDisponibilidad`.

* **`app/src/app/features/paciente/profesionales/profesionales.page.ts`**
  - Se actualizó `verDisponibilidad()` para navegar a `/paciente/detalle-profesional/:idMedico` en lugar de mostrar un toast placeholder.

### Archivos creados

* **`app/src/app/features/paciente/detalle-profesional/detalle-profesional.page.ts`** — Componente standalone de la vista de detalle del profesional.
* **`app/src/app/features/paciente/detalle-profesional/detalle-profesional.page.html`** — Template con perfil, badges de registro/experiencia, grupos de horarios seleccionables y barra inferior de reserva.
* **`app/src/app/features/paciente/detalle-profesional/detalle-profesional.page.scss`** — Estilos con tokens `--mc-*`, layout responsivo y animación de skeleton.

* **`app/src/app/features/paciente/elegir-horario/elegir-horario.page.ts`** — Componente standalone con calendario mensual, navegación entre meses y agrupación de slots mañana/tarde.
* **`app/src/app/features/paciente/elegir-horario/elegir-horario.page.html`** — Template con mini tarjeta de contexto del médico, grid de calendario 7 columnas y chips de horario.
* **`app/src/app/features/paciente/elegir-horario/elegir-horario.page.scss`** — Estilos del calendario con estados (hoy, disponible, seleccionado, fuera de mes).

* **`app/src/app/features/paciente/confirmar-reserva/confirmar-reserva.page.ts`** — Componente standalone con formulario de confirmación, validación de motivo y llamada POST.
* **`app/src/app/features/paciente/confirmar-reserva/confirmar-reserva.page.html`** — Template con tarjeta resumen, radio group de modalidad, textarea y botones de acción.
* **`app/src/app/features/paciente/confirmar-reserva/confirmar-reserva.page.scss`** — Estilos del formulario con radio custom, banner informativo y botones primario/secundario.

### Seguridad implementada
* Todos los endpoints protegidos con `requireAuth` + `requireRole('Paciente')`.
* El `id_paciente` se obtiene siempre del JWT, nunca del cliente (prevención IDOR).
* La reserva usa transacción con `SELECT ... FOR UPDATE` para evitar doble reserva por race condition.
* Validación de parámetros numéricos con `parseInt` y comprobación `isNaN`.
* Motivo de consulta sanitizado y validado en longitud (3–255 caracteres) tanto en frontend como backend.
* Modalidad validada contra whitelist: `presencial` o `telemedicina`.

### Flujo completo de navegación
* Especialidades → Profesionales → **Detalle Profesional** → **Elegir Horario** → **Confirmar Reserva** → Home (tras éxito)
