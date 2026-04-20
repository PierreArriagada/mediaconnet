# Flujo de Reserva de Citas — Fase 3

## Detalle Profesional, Elegir Horario y Confirmar Reserva

---

### Qué se realizó
* Creación de tres nuevas vistas para completar el flujo de reserva de citas del módulo paciente:
  - **Detalle Profesional**: vista informativa rica del profesional médico. Muestra perfil con avatar de iniciales, nombre, especialidad, estrellas de valoración (sobre 5), cantidad de opiniones, tres tarjetas de estadísticas (años de experiencia, consultas realizadas, número de registro), biografía, descripción de la especialidad, horario de atención semanal con días y rango de horas, e indicador del próximo horario disponible. No incluye selección de slots; la vista es exclusivamente informativa. Botón fijo inferior "Ver horarios disponibles" navega a la vista de Elegir Horario.
  - **Elegir Horario**: calendario mensual interactivo que resalta únicamente los días con disponibilidad; al seleccionar un día muestra los bloques horarios separados en mañana/tarde. Incluye mini tarjeta de contexto del médico en la parte superior.
  - **Confirmar Reserva**: formulario final de confirmación con resumen visual del médico, fecha y hora seleccionados; permite elegir modalidad (presencial/telemedicina), escribir motivo de consulta (3–255 caracteres) y enviar la reserva.
* Creación de tres nuevos endpoints en el backend para soportar las vistas:
  - `GET /api/paciente/medico/:idMedico` — perfil enriquecido del médico con biografía, valoración promedio, total de valoraciones, horario de atención semanal (días y rangos), próximo slot disponible y total de consultas realizadas.
  - `GET /api/paciente/medico/:idMedico/disponibilidad` — disponibilidad completa futura del médico para el calendario.
  - `POST /api/paciente/reservar` — crea la cita médica con transacción, bloqueo pesimista del slot (`FOR UPDATE`), marca disponibilidad como reservada y genera notificación de confirmación.
* Creación de interfaces y métodos en el servicio Angular para consumir los nuevos endpoints.
* Registro de las tres nuevas rutas lazy-loaded en el módulo de paciente.

### Qué se modificó

* **`database/01_init.sql`**
  - Se agregaron tres columnas nuevas a la tabla `medicos`: `biografia` (VARCHAR 500), `valoracion_promedio` (NUMERIC 2,1 con default 0.0), `total_valoraciones` (INTEGER con default 0).
  - Se actualizaron los INSERTs de medicos para incluir biografía, valoración promedio y total de valoraciones con datos realistas.

* **`backend/src/controllers/paciente.controller.js`**
  - Se rediseñó la función `getDetalleMedico` para retornar: datos enriquecidos del médico (incluye biografía, valoración, total valoraciones), horario de atención semanal calculado desde la disponibilidad, próximo slot disponible y total de consultas realizadas.
  - Se mantuvieron las funciones `getDisponibilidadMedico` y `crearCitaPaciente` sin cambios.
  - Se actualizó el `module.exports` para incluir las tres funciones.

* **`backend/src/routes/paciente.routes.js`**
  - Sin cambios; las rutas existentes siguen vigentes.

* **`app/src/app/core/services/paciente.service.ts`**
  - Se agregó interfaz `HorarioAtencion` con campos `dia_semana`, `hora_inicio`, `hora_fin`.
  - Se actualizó la interfaz `DetalleMedicoData` para incluir: `biografia`, `valoracion_promedio`, `total_valoraciones` en el objeto médico; `horarioAtencion` como arreglo de horarios semanales; `proximoSlot` con fecha y hora del próximo turno disponible; `totalConsultas` como entero.
  - Se eliminó el campo `disponibilidad` de `DetalleMedicoData` ya que la vista de detalle ahora es solo informativa.

* **`app/src/app/features/paciente/detalle-profesional/detalle-profesional.page.ts`**
  - Se rediseñó completamente: se eliminó la selección de slots y señales relacionadas, se eliminó el agrupador de disponibilidad por fecha.
  - Se agregaron nuevos métodos: `verHorarios()` para navegar a elegir-horario, `estrellas()` para generar arreglo de estrellas llenas/media/vacías según valoración, `nombreDia()` para convertir ISODOW a nombre de día.
  - Se simplificó el flujo de navegación: el botón inferior ahora es "Ver horarios disponibles" en lugar de "Reservar hora".

* **`app/src/app/features/paciente/detalle-profesional/detalle-profesional.page.html`**
  - Se rediseñó completamente la plantilla: se agregó sección de estrellas de valoración con conteo de opiniones, tres tarjetas de estadísticas (experiencia, consultas, registro), sección de biografía del profesional, sección de horario de atención semanal con días y rangos de horas, indicador del próximo horario disponible con formato legible.
  - Se eliminó toda la sección de selección de slots (grupos de fecha y chips de horario).
  - El botón inferior ahora es de ancho completo con texto "Ver horarios disponibles" e ícono de calendario.

* **`app/src/app/features/paciente/detalle-profesional/detalle-profesional.page.scss`**
  - Se rediseñó completamente: se agregaron estilos para estrellas de valoración (llenas, media, vacías con color ámbar), tarjetas de estadísticas en grid de 3 columnas, horario de atención con filas separadas por bordes, indicador de próximo slot con fondo degradado, títulos de sección con ícono Material al lado.
  - Se eliminaron estilos de chips de horario, grupos de fecha y estado vacío que ya no se usan.
  - Se mejoró el botón inferior con variante full-width y soporte para ícono.

* **`app/angular.json`**
  - Se aumentaron los límites de presupuesto de estilos por componente: `maximumWarning` de 2kb a 10kb, `maximumError` de 4kb a 16kb, para acomodar los estilos enriquecidos de las vistas.

### Archivos creados

* **`app/src/app/features/paciente/detalle-profesional/detalle-profesional.page.ts`** — Se agregó propiedad `activeTab = 'info'` para controlar la pestaña activa entre "Informacion" y "Disponibilidad".

* **`app/src/app/features/paciente/detalle-profesional/detalle-profesional.page.html`** — Rediseño completo inspirado en el mockup de identidad. Encabezado con avatar rectangular y badge de verificado superpuesto, nombre en tipografía authority pesada, especialidad en primary, pills de rating (fondo dorado) y experiencia (fondo azul secundario). Tabs "Informacion" / "Disponibilidad" con indicador de borde activo. Tab Info: tarjeta "Sobre el Profesional" con bio + mini celdas de experiencia y consultas, tarjeta de especialidad, tarjeta de registro. Tab Disponibilidad: tarjeta de próximo slot en verde, tarjeta de horario semanal con pills, botón "Ver calendario completo" con borde primario. Barra inferior con texto de siguiente disponibilidad a la izquierda y botón "Reservar hora" con pill gradient a la derecha.

* **`app/src/app/features/paciente/detalle-profesional/detalle-profesional.page.scss`** — SCSS completamente reescrito. Avatar rectangular con `border-radius: var(--mc-radius-md)` y sombra. Badge de verificado en círculo primario posicionado `absolute`. Pills `.mc-pill--gold` (tertiary-fixed) y `.mc-pill--blue` (secondary-container). Tabs con `border-bottom: 3px solid var(--mc-primary)` en estado activo. Tarjetas `.mc-card` con `box-shadow: 0 8px 32px rgba(0,0,0,0.04)`. Celdas `.mc-card__cell` en grid 2 columnas con fondo `surface-container-low`. Horario en filas alternas. Próximo slot con `rgba(5,150,105,0.06)` background y `1.5px solid rgba(5,150,105,0.22)` border. Barra inferior con glassmorphism (`backdrop-filter: blur(20px)`), texto de info a la izquierda y botón pill `border-radius: var(--mc-radius-xl)` a la derecha.

* **`app/angular.json`** — Se aumentó el presupuesto de estilos por componente a `maximumWarning: 16kb` y `maximumError: 24kb`.


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
* Especialidades → Profesionales → **Detalle Profesional** (info) → **Elegir Horario** (selección) → **Confirmar Reserva** (formulario) → Home (tras éxito)
* El flujo es congruente: primero se consulta la información del profesional, luego se selecciona el horario deseado y finalmente se confirma la reserva.


### Actualizaciones UI: Confirmar Reserva
* **Qué se realizó:** Rediseño completo de la vista de confirmar reserva adoptando el estilo moderno en cuadrícula (Bento UI) basado en la referencia HTML.
* **Qué se modificó:** Reestructuración semántica del HTML en dos columnas para dispositivos grandes separando el contenido editorial y de resumen de los controles de formulario; actualización exhaustiva en SCSS aplicando tokens (\--mc-*\) para sombras profundas, avatares más grandes, tipografías marcadas y componentes de entrada refinados.

