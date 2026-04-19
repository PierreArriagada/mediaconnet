# Detalle de Cita Médica — Vista `citas/:idCita`

## Qué se realizó
* Creación de la vista de detalle de cita médica para el paciente autenticado
* La vista muestra toda la información relevante de una cita: progreso, datos del médico, especialidad, fecha, hora, modalidad, motivo de consulta y contacto del centro
* Se implementaron las acciones de **Cancelar** y **Reagendar** cita con confirmación y lógica transaccional en backend

## Qué se modificó

### Backend
* **Controlador:** `backend/src/controllers/paciente.controller.js`
  - Se agregaron 3 funciones: `getDetalleCita`, `cancelarCita`, `reagendarCita`
  - `getDetalleCita`: retorna detalle completo de la cita con datos del médico, especialidad, disponibilidad y estado; incluye prevención IDOR verificando propiedad del paciente autenticado
  - `cancelarCita`: cancela la cita (solo si está pendiente o confirmada), libera el slot de disponibilidad y crea notificación; operación transaccional con `FOR UPDATE`
  - `reagendarCita`: reprograma la cita a un nuevo slot del mismo médico; libera slot anterior, reserva nuevo slot, actualiza fecha/hora de la cita; operación transaccional con doble `FOR UPDATE` para evitar condiciones de carrera
* **Rutas:** `backend/src/routes/paciente.routes.js`
  - Se agregaron 3 rutas: `GET /cita/:idCita`, `PATCH /cita/:idCita/cancelar`, `PATCH /cita/:idCita/reagendar`
  - Todas protegidas por JWT + rol Paciente

### Frontend
* **Estilos Globales:** `app/src/global.scss`
  - Se agregó la clase `.mc-alert-modal` con variables `--width` y `--border-radius` para el layout del web-modal custom
* **Nuevo componente:** `app/src/app/features/paciente/citas/`
  - `cita-detalle.page.ts` — Lógica: carga de datos, reemplaza el `AlertController` y utiliza el `ModalController` con el UI system de MediConnect para la confirmación (`McAlertComponent`)
  - `cita-detalle.page.html` — Template con layout de 2 columnas: izquierda (timeline + `<app-centro-contacto>`) y derecha (tarjeta de datos con info grid bento + notas + tarjeta del médico)
  - `cita-detalle.page.scss` — Estilos con `--mc-*`, soporte modo oscuro, responsive mobile-first, skeletons de carga; los estilos de contacto fueron movidos al componente `centro-contacto`
* **Nuevo componente compartido:** `app/src/app/shared/components/alertas-sistema/mc-alert/`
  - `mc-alert.component.ts` — Componente standalone de IonModal reutilizable que reemplaza los Alerts nativos
  - `mc-alert.component.html` — Layout de la alerta (título, mensaje, botones dinámicos)
  - `mc-alert.component.scss` — Estilos de UI siguiendo variables CSS `--mc-*`
* **Nuevo componente compartido:** `app/src/app/shared/components/centro-contacto/`
  - `centro-contacto.component.ts` — Componente standalone con `@Input()` para `titulo`, `direccion` y `telefono`; reutilizable en cualquier vista
  - `centro-contacto.component.html` — Tarjeta con items de dirección y teléfono
  - `centro-contacto.component.scss` — Estilos `.mc-card`, `.mc-contact-list` y `.mc-contact-item` encapsulados en el componente
* **Servicio:** `app/src/app/core/services/paciente.service.ts`
  - Se agregaron interfaces: `DetalleCita`, `DetalleCitaData`, `MensajeResponse`
  - Se agregaron métodos: `getDetalleCita()`, `cancelarCita()`, `reagendarCita()`
* **Rutas:** `app/src/app/features/paciente/paciente.routes.ts`
  - Se agregó la ruta `citas/:idCita` con lazy loading apuntando a `./citas/cita-detalle.page`
* **Home:** `app/src/app/features/paciente/home/paciente-home.page.html` y `paciente-home.page.ts`
  - La tarjeta de próxima cita navega con el método `verCita(id)` que llama `router.navigate(['/paciente', 'citas', id])` — segmentos separados, sin string-slash que Angular URL-encodaría como `%2F`

* **Funcionalidades:**
  - **Acción Cancelar:** diálogo de confirmación custom con `McAlertComponent`; cancela y libera el slot
  - **Timeline de progreso:** pasos dinámicos según `estado_cita` (pendiente / confirmada / completada / cancelada / reprogramada)
* **Información completa:** profesional, fecha, hora, modalidad, motivo de consulta, observaciones
* **Contacto del centro:** dirección y teléfono del centro médico
* **Acción Reagendar:** navega a `elegir-horario/:idMedico` con queryParam `reagendarCita` para el nuevo slot
* **Chips de estado:** colores diferenciados por estado
* **Tarjeta del médico:** avatar con iniciales, biografía, experiencia y valoraciones
* **Skeleton de carga:** shimmer animation
* **Soporte modo oscuro:** ajustes automáticos de colores en chips de warning y success

## Seguridad
* Prevención IDOR: la cita solo se retorna si pertenece al paciente del JWT autenticado
* Operaciones de cancelar y reagendar usan transacciones con `FOR UPDATE` para evitar condiciones de carrera
* Solo estados `pendiente` o `confirmada` permiten cancelar o reagendar
* Diálogo de confirmación antes de cancelar para evitar acciones accidentales


## Qué se realizó
* Creación de la vista de detalle de solicitud de cita médica para el paciente autenticado
* La vista muestra toda la información relevante de una cita: progreso, datos del médico, especialidad, fecha, hora, modalidad, motivo de consulta y contacto del centro
* Se implementaron las acciones de **Cancelar** y **Reagendar** cita con confirmación y lógica transaccional en backend

## Qué se modificó

### Backend
* **Controlador:** `backend/src/controllers/paciente.controller.js`
  - Se agregaron 3 funciones: `getDetalleCita`, `cancelarCita`, `reagendarCita`
  - `getDetalleCita`: retorna detalle completo de la cita con datos del médico, especialidad, disponibilidad y estado; incluye prevención IDOR verificando propiedad del paciente autenticado
  - `cancelarCita`: cancela la cita (solo si está pendiente o confirmada), libera el slot de disponibilidad y crea notificación; operación transaccional con `FOR UPDATE`
  - `reagendarCita`: reprograma la cita a un nuevo slot del mismo médico; libera slot anterior, reserva nuevo slot, actualiza fecha/hora de la cita; operación transaccional con doble `FOR UPDATE` para evitar condiciones de carrera
* **Rutas:** `backend/src/routes/paciente.routes.js`
  - Se agregaron 3 rutas: `GET /cita/:idCita`, `PATCH /cita/:idCita/cancelar`, `PATCH /cita/:idCita/reagendar`
  - Todas protegidas por JWT + rol Paciente

### Frontend
* **Nuevo componente:** `app/src/app/features/paciente/detalle-solicitud/`
  - `detalle-solicitud.page.ts` — Lógica del componente: carga de datos, timeline dinámico según estado, acciones de cancelar (con diálogo de confirmación) y reagendar (redirige al flujo de elegir horario)
  - `detalle-solicitud.page.html` — Template con layout de 2 columnas: izquierda (timeline de progreso + contacto del centro) y derecha (tarjeta de datos con info grid bento + notas + tarjeta del médico)
  - `detalle-solicitud.page.scss` — Estilos siguiendo el sistema de diseño `--mc-*`, soporte modo oscuro, responsive, skeletons de carga
* **Servicio:** `app/src/app/core/services/paciente.service.ts`
  - Se agregaron interfaces: `DetalleCita`, `DetalleCitaData`, `MensajeResponse`
  - Se agregaron métodos: `getDetalleCita()`, `cancelarCita()`, `reagendarCita()`
* **Rutas:** `app/src/app/features/paciente/paciente.routes.ts`
  - Se agregó la ruta `detalle-solicitud/:idCita` con lazy loading
* **Home:** `app/src/app/features/paciente/home/paciente-home.page.html`
  - La tarjeta de próxima cita ahora navega a `detalle-solicitud/:idCita` en lugar de `citas/:idCita`

## Funcionalidades
* **Timeline de progreso:** muestra pasos dinámicos según el estado de la cita (pendiente → confirmada → completada), con estados especiales para cancelada y reprogramada
* **Información completa:** profesional asignado, fecha, hora, modalidad, motivo de consulta, observaciones
* **Contacto del centro:** dirección y teléfono del centro médico
* **Acción Cancelar:** diálogo de confirmación con `AlertController`, cancela la cita y libera el horario
* **Acción Reagendar:** navega al flujo de elegir horario con el mismo médico para seleccionar un nuevo slot
* **Chips de estado:** colores diferenciados por estado (pendiente amarillo, confirmada azul, cancelada rojo, completada verde, reprogramada secundario)
* **Tarjeta del médico:** avatar con iniciales, biografía, experiencia y valoraciones
* **Skeleton de carga:** shimmer animation mientras carga los datos
* **Soporte modo oscuro:** ajustes automáticos de colores en chips

## Seguridad
* Prevención IDOR: la cita solo se retorna si pertenece al paciente del JWT autenticado
* Operaciones de cancelar y reagendar usan transacciones con `FOR UPDATE` para evitar condiciones de carrera
* Validación de estados permitidos (solo pendiente/confirmada pueden modificarse)
* Diálogo de confirmación antes de cancelar para evitar acciones accidentales
