# Confirmación de Asistencia — Ventana 24 Horas

## Qué se realizó
- Implementación del flujo completo de confirmación de asistencia anticipada: cuando el paciente tiene una cita `confirmada` dentro de las próximas 24 horas y no ha respondido aún, la app muestra un modal al abrir el dashboard preguntando si asistirá o si desea cancelar.
- Corrección del estado incorrecto: `reagendarCita` ahora establece `estado_cita = 'confirmada'` en vez de `'pendiente'`.
- Notificación al médico cuando el paciente cancela una cita.
- Agregada columna `confirmada_asistencia BOOLEAN DEFAULT NULL` en `citas_medicas`.
- Corregidas citas históricas con estado `'pendiente'` incorrecto (pacientes con slot asignado) mediante `UPDATE` directo en BD viva.
- Eliminado el campo visual `ID:` de las tarjetas del historial.

## Base de datos
- **`database/01_init.sql`** — columna `confirmada_asistencia BOOLEAN DEFAULT NULL` agregada en la definición de `citas_medicas`. Valores posibles: `NULL` (paciente no ha respondido), `TRUE` (confirmó asistencia). La cancelación no usa esta columna, usa el flujo normal de `estado_cita = 'cancelada'`.
- **BD viva (contenedor `mediconnect-postgres`)** — columna aplicada en caliente con `ALTER TABLE citas_medicas ADD COLUMN IF NOT EXISTS confirmada_asistencia BOOLEAN DEFAULT NULL`. Resultado: `ALTER TABLE` (éxito confirmado). No requirió reinicio.
- **Corrección de datos históricos** — ejecutado `UPDATE citas_medicas SET estado_cita = 'confirmada'` para citas con `id_disponibilidad IS NOT NULL`, `estado_cita = 'pendiente'` y paciente con `id_usuario` asignado. Corrige citas que quedaron en estado `'pendiente'` por el bug de `reagendarCita`.

## Archivos modificados — Backend
- **`backend/src/controllers/paciente.controller.js`**:
  - `getDashboard` — agrega tercera consulta SQL que detecta cita `confirmada` con fecha+hora entre `NOW()` y `NOW() + INTERVAL '24 hours'` y `confirmada_asistencia IS NOT TRUE`; la retorna como `citaPendienteConfirmacion`.
  - `confirmarAsistencia` (nueva función) — endpoint `PATCH /cita/:idCita/confirmar-asistencia`; verifica propiedad anti-IDOR, marca `confirmada_asistencia = TRUE`, crea notificación tipo `'confirmacion'` al médico con nombre del paciente y fecha/hora, crea notificación de confirmación al paciente.
  - `cancelarCita` — amplía el SELECT para obtener `id_usuario_medico`, nombre y apellido del paciente; crea notificación tipo `'cancelacion'` al médico informando quién canceló y la fecha/hora de la cita.
  - `reagendarCita` — corregido: establece `estado_cita = 'confirmada'` (antes `'pendiente'`), resetea `confirmada_asistencia = NULL` para que la ventana de 24h vuelva a activarse con la nueva fecha.
  - `module.exports` — actualizado para incluir `confirmarAsistencia`.
- **`backend/src/routes/paciente.routes.js`** — importada `confirmarAsistencia`; registrada ruta `PATCH /cita/:idCita/confirmar-asistencia` con middleware de autenticación.

## Archivos modificados — Frontend (servicio)
- **`app/src/app/core/services/paciente.service.ts`**:
  - Nueva interface `CitaPendienteConfirmacion` con campos: `id_cita`, `fecha_cita`, `hora_cita`, `modalidad`, `medico_nombre`, `medico_apellido`, `nombre_especialidad`.
  - Interface `DashboardData` actualizada: agrega campo `citaPendienteConfirmacion: CitaPendienteConfirmacion | null`.
  - Nuevo método `confirmarAsistencia(idCita: number): Observable<MensajeResponse>` que llama al endpoint `PATCH`.
- **`app/package.json`**:
  - Agregadas dependencias `@capacitor/android` y `@capacitor/local-notifications` para habilitar la integración nativa Android del recordatorio local.

## Archivos modificados — Frontend (vista home del paciente)
- **`app/src/app/features/paciente/home/paciente-home.page.ts`**:
  - Importada `CitaPendienteConfirmacion` desde el servicio.
  - Nuevas propiedades de estado: `showConfirmModal`, `citaConfirmar`, `confirmLoading`.
  - `loadDashboard` — al recibir `citaPendienteConfirmacion` con valor, asigna los datos, activa el modal y dispara la notificación local Android si la app está corriendo de forma nativa.
  - Nuevo método `onConfirmarAsistencia()` — llama al servicio, maneja loading, limpia el recordatorio local de Android y cierra el modal al éxito.
  - Nuevo método `onCancelarDesdeModal()` — ejecuta la cancelación, limpia el recordatorio local de Android y refresca el dashboard.
- **`app/src/app/features/paciente/home/paciente-home.page.html`**:
  - Modal overlay con clase `.mc-confirm-overlay` que aparece encima del contenido cuando `showConfirmModal` es `true`.
  - Contiene: ícono decorativo, texto explicativo, datos de la cita (médico, especialidad, fecha, hora), botón "Sí, asistiré" con spinner inline durante `confirmLoading`, botón "Cancelar cita" con estilo de error.
- **`app/src/app/features/paciente/home/paciente-home.page.scss`**:
  - Estilos para `.mc-confirm-overlay` (fondo semi-transparente de pantalla completa) y `.mc-confirm-modal` (card centrada).
  - Animaciones `@keyframes mc-fade-in` y `@keyframes mc-slide-up`.
  - Spinner CSS `@keyframes mc-spin` para el estado de carga del botón.
  - Usa exclusivamente tokens `--mc-*`.
- **`app/src/app/core/services/notificaciones-nativas.service.ts`**:
  - Nuevo servicio encapsulado para Android nativo con Capacitor.
  - Crea el canal local `mc-citas`, solicita permisos solo cuando existe una cita pendiente real, programa una notificación local inmediata y evita duplicados con una huella persistida por cita.
  - Cuando el usuario toca la notificación del sistema, navega al detalle de la cita correspondiente.
- **`app/src/app/app.component.ts`**:
  - Inicializa el canal y el listener de notificaciones nativas al arrancar la app, sin forzar el permiso al usuario en el arranque.

## Archivos modificados — Plataforma Android
- **`app/android/`**:
  - Generada la plataforma Android de Capacitor dentro del proyecto.
  - El proyecto Android ya quedó enlazado con el plugin de notificaciones locales y con los assets web compilados de la app.
  - El toque sobre la notificación del sistema queda conectado al flujo nativo de la app Android.

## Archivos modificados — Historial
- **`app/src/app/features/paciente/historial/historial.page.html`** — eliminado el elemento `ID: {{ cita.id_cita }}` visible en las tarjetas del historial; el `id_cita` se conserva en el modelo para navegación interna.
- **`app/src/app/features/paciente/historial/historial.page.scss`** — eliminado bloque `&__id`; `justify-content` de `&__top` cambiado a `flex-start`.
- **`app/src/app/features/paciente/historial/historial.page.ts`** — eliminado `IonSpinner` de los imports (no se usaba).

## Flujo completo del sistema de notificaciones

- **Confirmar asistencia:** paciente confirma → `confirmada_asistencia = TRUE` en BD → notificación `'confirmacion'` al médico (título: "Paciente confirmó asistencia", mensaje con nombre del paciente y fecha/hora) → notificación `'confirmacion'` al paciente → modal desaparece y no vuelve a mostrarse para esa cita.
- **Recordatorio local Android:** cuando el dashboard detecta una cita dentro de 24 horas y la app corre como Android nativo, se crea una notificación local del sistema con alta prioridad; al tocarla, abre el detalle de la cita.
- **Cancelar desde modal:** ejecuta el mismo flujo de `cancelarCita` → `estado_cita = 'cancelada'`, disponibilidad liberada → notificación `'cancelacion'` al médico (con nombre del paciente y fecha/hora) → notificación `'cancelacion'` al paciente.
- **Reagendar:** `estado_cita = 'confirmada'`, `confirmada_asistencia = NULL` → cuando la nueva fecha caiga en la ventana de 24h, el modal volverá a activarse.
- **Ignorar (cerrar app sin responder):** `confirmada_asistencia` permanece `NULL` → el modal reaparece la próxima vez que el paciente abra el dashboard mientras la cita siga dentro de la ventana de 24h.

## Dependencias entre archivos
- `paciente-home.page.ts` depende de `CitaPendienteConfirmacion` de `paciente.service.ts`.
- El modal en `paciente-home.page.html` depende de `showConfirmModal` y `citaConfirmar` del componente.
- `notificaciones-nativas.service.ts` depende del mismo objeto `CitaPendienteConfirmacion` entregado por el backend; no crea datos paralelos ni mocks.
- `confirmarAsistencia` en el backend obtiene el `id_usuario` del médico mediante JOIN en la misma query, no en consulta separada.
- La columna `confirmada_asistencia` en la BD es el único punto de verdad; no depende de notificaciones ni estados derivados.

## Invariante garantizada
- `confirmada_asistencia = NULL` → pendiente de respuesta.
- `confirmada_asistencia = TRUE` → paciente confirmó; el modal no vuelve a aparecer.
- La cancelación no usa `confirmada_asistencia`; la cita pasa directamente a `estado_cita = 'cancelada'`.

## Estado de prueba actual
- La base real ya tiene una cita que dispara este flujo: `id_cita = 4`, paciente autenticado `paciente1@mediconnect.cl`, fecha `2026-04-21`, hora `09:00`, estado `confirmada`, `confirmada_asistencia = NULL`.
- En web y en el contenedor actual, el modal interno queda listo para verse al entrar al dashboard con ese usuario.
- La notificación en la barra del sistema requiere ejecutar la app como Android nativo; el proyecto `app/android/` ya existe, pero la imagen Docker actual todavía no trae Java ni Android SDK para compilar e instalar el APK desde ese mismo contenedor.
