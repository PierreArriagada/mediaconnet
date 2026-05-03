# Vista Inicio del Profesional - MediConnect

## Descripcion general
La vista Inicio del modulo medico ya reemplaza la pantalla de pruebas anterior. Hoy funciona como portada operativa del profesional para revisar actividad del dia, marcar asistencia y navegar al resto del modulo.

## Bloques visibles hoy

### 1. Header compartido
- **Componente:** `MedicoHeaderComponent`
- **Funcionalidad:** muestra nombre del profesional, identidad visual clinica y acceso a la bandeja de notificaciones.

### 2. Saludo y accesos rapidos
- Saludo con el primer nombre del medico.
- Botones a `Agenda`, `Pacientes` y `Notificaciones`.

### 3. Resumen operativo
- Tarjeta con `pendientesMarcar`.
- Tarjeta con cantidad de `citasHoy`.
- Datos cargados desde `GET /api/medico/dashboard`.

### 4. Proxima cita
- Tarjeta destacada con paciente, especialidad, fecha, hora y modalidad.
- Solo se muestra cuando el backend devuelve `proximaCita`.

### 5. Tabs de trabajo
- `Citas pasadas / hoy`.
- `Proximas`.
- Cada tab carga su lista por separado para no refrescar toda la pantalla.

### 6. Tarjetas de cita
- Paciente, especialidad, fecha, hora, modalidad y motivo.
- Badge de preconfirmacion del paciente cuando aplica.
- Badge de asistencia cuando la cita ya fue marcada.
- Boton `Ver detalle`.
- Botones `Asistio` y `No asistio` solo para citas del tab `hoy` sin registro previo.

### 7. Estados auxiliares
- Pull to refresh.
- Skeleton de carga inicial y por tab.
- Toast de exito y error.
- Estado vacio por seccion.
- Navbar inferior del medico.

## Servicios y endpoints usados hoy
- `MedicoService.getDashboard()` -> `GET /api/medico/dashboard`
- `MedicoService.getCitasParaMarcar()` -> `GET /api/medico/citas-hoy`
- `MedicoService.getCitasProximas()` -> `GET /api/medico/citas-proximas`
- `MedicoService.marcarAsistencia()` -> `PATCH /api/medico/cita/:idCita/marcar-asistencia`
- `AuthService` para resolver el usuario autenticado.
- `ModalController` + `McAlertComponent` para la confirmacion previa al marcado.

## Estado real de implementacion
- El Inicio ya esta conectado a datos reales del backend.
- El bloque de solicitudes del flujo invitado sigue presente como TODO y hoy no se renderiza.
- El boton `Ver detalle` aun no abre una vista clinica real: redirige a `/medico/citas`, que sigue siendo placeholder.
- El badge de notificaciones del header depende del estado compartido del modulo y hoy se alimenta principalmente desde la bandeja de notificaciones.

## Proximos ajustes naturales
- Separar solicitudes pendientes del flujo invitado frente a reservas confirmadas.
- Reemplazar `/medico/citas` por una vista real de detalle de cita.
- Integrar el contador de no leidas desde el dashboard o una carga global para no depender de abrir la bandeja.