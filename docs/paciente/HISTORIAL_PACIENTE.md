# Historial de Citas del Paciente

## Qué se realizó
- Creación de la vista completa de historial de citas para el paciente autenticado.
- La vista permite filtrar por tres pestañas: Pendientes, Confirmadas y Pasadas.
- Se implementó la lógica de badge diferenciado: los invitados sin slot asignado ven "En revisión"; los pacientes registrados y los invitados con slot ven el estado real de la base de datos.
- Cada tarjeta muestra médico, especialidad, fecha, hora, modalidad y —solo para citas completadas— el diagnóstico del historial de atenciones.
- Se incluye una tarjeta CTA con gradiente para navegar a nueva reserva.
- Estado vacío y skeleton shimmer durante la carga.

## Archivos creados
- **`app/src/app/features/paciente/historial/historial.page.ts`** — componente standalone con signal para tab activo y lista de citas, lógica de badge, formatFecha/formatHora, navegación a detalle y a reservar.
- **`app/src/app/features/paciente/historial/historial.page.html`** — template con header editorial, tabs de navegación con roles ARIA, skeleton, bento grid responsive, tarjetas de cita con badges, estado vacío y tarjeta CTA.
- **`app/src/app/features/paciente/historial/historial.page.scss`** — estilos BEM con prefijo `hs-`, usa exclusivamente tokens `--mc-*`, animación de skeleton `@keyframes hs-shimmer`, chips de estado en múltiples variantes.

## Archivos modificados
- **`backend/src/controllers/paciente.controller.js`** — añadida función `getHistorialCitas` antes del `module.exports`; actualizado el objeto de exportaciones para incluirla.
- **`backend/src/routes/paciente.routes.js`** — importada `getHistorialCitas` en la desestructuración del controller; registrada ruta `GET /historial`.
- **`app/src/app/core/services/paciente.service.ts`** — añadidas interfaces `CitaHistorial` y `HistorialData`; añadido método `getHistorial(tab: string): Observable<HistorialData>`.
- **`app/src/app/features/paciente/paciente.routes.ts`** — añadida ruta lazy `historial` que carga `HistorialPage`.

## Dependencias utilizadas (sin modificar)
- **`app/src/app/shared/components/paciente-header/paciente-header.component.ts`** — recibe `userName` y `noLeidas`.
- **`app/src/app/shared/components/paciente-bottom-nav/paciente-bottom-nav.component.ts`** — recibe `activeTab="historial"`.
- **`app/src/app/features/paciente/citas/cita-detalle.page.ts`** — destino de "Ver detalle" y acciones Reagendar/Cancelar (redirigen al detalle donde vive la lógica de cada acción).

## Corrección de raíz — bug "En revisión" para usuarios registrados

### Problema detectado
- Un paciente que reservó como invitado y luego creó una cuenta veía el badge "En revisión" en su historial en vez de "Pendiente".
- Causa: al vincular el paciente invitado con la nueva cuenta en registro, el campo `es_invitado = TRUE` de sus citas no se limpiaba.
- En BD: cita 11 tenía `es_invitado = TRUE` para `id_usuario = 34` (usuario registrado).

### Archivos corregidos
- **`backend/src/controllers/auth.controller.js`** — en la transacción de registro, cuando se vincula un paciente invitado existente, se ejecuta `UPDATE citas_medicas SET es_invitado = FALSE` para todas sus citas. El flag pasa a reflejar correctamente que el paciente ya es un usuario registrado.
- **`app/src/app/features/paciente/historial/historial.page.ts`** — eliminada la condición de badge "En revisión" de `badgeEstado()`. El historial es exclusivo de usuarios autenticados; el estado del badge siempre se determina por el `estado_cita` real de la BD, nunca por `es_invitado`.
- **Base de datos (corrección de datos históricos)** — ejecutado `UPDATE citas_medicas SET es_invitado = FALSE` para todas las citas cuyo paciente ya tiene `id_usuario` asignado (1 fila corregida: cita 11).

### Invariante garantizada
- `es_invitado = TRUE` solo persiste en citas de pacientes sin cuenta (`id_usuario IS NULL`).
- En cuanto el paciente crea cuenta, registro hace dos UPDATE en una sola transacción: pacientes y citas_medicas.
- El historial del paciente autenticado siempre muestra el estado_cita real sin sobrescritura de badges administrativos.
