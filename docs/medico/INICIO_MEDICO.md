# Vista Inicio del Profesional - MediConnect

## Descripción General
La vista Inicio del módulo profesional es la pantalla principal que se carga al acceder al rol de médico. Reemplaza la pantalla de pruebas anterior y proporciona un dashboard operativo con información clave para gestionar la asistencia de pacientes.

## Estructura de la Vista

### 1. Header del Médico
- **Componente**: `MedicoHeaderComponent`
- **Funcionalidades**:
  - Nombre del profesional
  - Identidad visual clínica
  - Badge de notificaciones no leídas
  - Acceso directo a la bandeja de notificaciones

### 2. Saludo Personalizado
- Mensaje de bienvenida con nombre del doctor
- Subtítulo descriptivo de la funcionalidad

### 3. Accesos Rápidos
- **Agenda**: Navega a `/medico/agenda`
- **Pacientes**: Navega a `/medico/pacientes`
- **Notificaciones**: Navega a `/medico/notificaciones`
- Diseño en grid de 3 columnas con iconos Material Symbols

### 4. Tarjetas de Resumen Estadístico
- **Pendientes de marcar**: Número de citas que requieren marcar asistencia
- **Citas hoy**: Cantidad de citas programadas para el día actual
- Iconos diferenciados y colores temáticos

### 5. Solicitudes Pendientes (Preparado para implementación)
- Sección reservada para solicitudes del flujo invitado
- Actualmente oculto hasta que el backend proporcione datos separados
- Diseño preparado con título y nota explicativa

### 6. Próxima Cita Futura
- Muestra la próxima cita confirmada
- Información del paciente, especialidad, fecha, hora y modalidad
- Efecto visual con gradiente primario

### 7. Sistema de Tabs
- **Citas pasadas/hoy**: Muestra citas que requieren revisión de asistencia
- **Próximas**: Lista citas futuras confirmadas
- Carga diferida por tab para optimizar rendimiento

### 8. Grid de Citas
- **Tarjetas de cita** con información completa:
  - Badge de estado de asistencia (si aplica)
  - Avatar y nombre del paciente
  - Especialidad
  - Fecha, hora y modalidad
  - Pre-confirmación del paciente (si aplica)
  - Motivo de consulta
  - Botón "Ver detalle" (navega a página de citas)
  - Botones de acción para marcar asistencia (solo para citas de hoy sin marcar)

### 9. Estados de Cita
- **Asistió**: Badge verde con check
- **No asistió**: Badge rojo con cancel
- **Pendiente**: Sin badge, muestra botones de acción

### 10. Estado Vacío
- Mensaje cuando no hay citas en la sección seleccionada
- Icono y texto contextual por tab

## Funcionalidades Interactivas

### Marcado de Asistencia
- Modal de confirmación antes de registrar asistencia
- Prevención de clics múltiples durante el proceso
- Recarga automática del dashboard tras marcar
- Mensajes de éxito/error con toast

### Navegación
- Pull-to-refresh para actualizar datos
- Navegación a detalle de cita (placeholder actual)
- Accesos rápidos a secciones principales

## Estados de Carga
- Skeleton loader durante carga inicial
- Skeleton por tab durante cambio de sección
- Indicadores de carga para acciones asíncronas

## Diseño Responsivo
- Grid adaptable para tarjetas de resumen
- Flex layout para elementos de cita
- Breakpoints para diferentes tamaños de pantalla

## Servicios Utilizados
- `MedicoService`: Para obtener dashboard, citas y marcar asistencia
- `AuthService`: Para información del usuario actual
- `ModalController`: Para confirmaciones de asistencia

## Notas de Implementación
- La separación de solicitudes pendientes requiere actualización del backend para proporcionar datos diferenciados
- El detalle de cita navega actualmente a una página placeholder; requiere implementación de la Fase 5
- Los accesos rápidos complementan la navegación por bottom nav sin reemplazarla

## Próximos Pasos
- Implementar backend para solicitudes pendientes
- Desarrollar vista de detalle de cita completa
- Agregar filtros adicionales en el grid de citas
- Implementar notificaciones push en tiempo real