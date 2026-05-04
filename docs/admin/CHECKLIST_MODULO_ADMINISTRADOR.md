* **Documento:** Checklist operativo del modulo administrador de MediConnect.
* **Objetivo:** Permitir seguimiento claro del desarrollo del backoffice, marcando lo que ya fue implementado y lo que todavia falta resolver para el rol Administrador.
* **Regla de uso:** Cada punto se marca solo cuando la funcionalidad queda operativa con datos reales, seguridad aplicada, rutas conectadas, comportamiento validado y documentacion actualizada.
* **Relacion documental:** Este checklist aterriza el alcance definido en ROADMAP_MODULO_ADMINISTRADOR.md y debe mantenerse sincronizado con ese documento.
* **Estado sincronizado:** Validado contra rutas, servicios y backend reales del repositorio al 2026-05-03.
* **Fase 0 - Definiciones bloqueantes del backoffice**
* [ ] Definir si el administrador puede modificar informacion clinica sensible o si solo la supervisa y gestiona operativamente.
* [ ] Definir si eliminar medico o paciente significa baja logica, bloqueo de acceso o borrado fisico condicionado a ausencia total de historia operativa.
* [ ] Definir si el administrador puede impersonar usuarios o si el soporte se limita a desbloqueo, activacion y reseteo de credenciales.
* [ ] Definir si el sistema requiere permisos administrativos granulares o si seguira existiendo un unico rol Administrador.
* [ ] Definir si las notificaciones admin necesitan abrir directamente entidades concretas mediante metadatos navegables persistidos.
* [ ] Definir si Notificaciones y Ajustes viviran en el header o en rutas de primer nivel del modulo admin.
* **Fase 1 - Shell base del modulo administrador**
* [x] Crear header admin reutilizable con nombre, rol, badge de notificaciones y acceso a ajustes.
* [x] Crear barra de navegacion admin con Inicio, Medicos, Pacientes, Operacion y Auditoria.
* [x] Crear estado compartido de notificaciones del administrador para evitar desincronizacion entre vistas cacheadas.
* [x] Extender el arbol de rutas del frontend con `/admin` y su entrada `/admin/home`.
* [x] Ajustar la redireccion por rol para que Administrador deje de caer en el dashboard generico y entre al modulo admin real.
* [x] Crear modulo backend `admin` con controlador, rutas y montaje real en `/api/admin`.
* [x] Proteger las rutas backend admin con JWT y `requireRole('Administrador')`.
* [x] Documentar el shell visual del administrador en `docs/admin`.
* **Fase 2 - Inicio del administrador**
* [x] Reemplazar el dashboard generico anterior por una vista Inicio propia del Administrador.
* [x] Renderizar hero operativo, metricas visuales iniciales, accesos rapidos y aviso de avance por fases.
* [x] Separar visualmente indicadores operativos y mensaje de estado del modulo, aunque aun sean visuales.
* [ ] Conectar el Inicio a un endpoint de dashboard admin con datos reales del sistema.
* [ ] Hacer navegables los accesos rapidos del Inicio hacia modulos reales del backoffice.
* [x] Documentar la vista Inicio del administrador en `docs/admin`.
* **Fase 3 - Centro Operativo del admin**
* [x] Crear la ruta `/admin/operacion` como hub del centro operativo.
* [x] Mostrar tarjetas disponibles para Horarios y Especialidades.
* [x] Montar `/admin/operacion/horarios`.
* [x] Montar `/admin/operacion/especialidades`.
* [ ] Montar `/admin/operacion/solicitudes`.
* [ ] Montar `/admin/operacion/citas`.
* **Fase 4 - Gestion de medicos**
* [x] Crear endpoint para listar medicos activos basicos (`GET /api/admin/medicos`).
* [ ] Agregar filtros por especialidad, estado, texto libre y disponibilidad futura al endpoint de medicos.
* [ ] Crear alta completa de medico generando `usuarios` y `medicos` en transaccion unica.
* [ ] Crear endpoints y vistas de detalle, edicion, activacion y bloqueo de medicos.
* [ ] Crear las vistas `/admin/medicos`, `/admin/medicos/nuevo` y `/admin/medicos/:idMedico`.
* [ ] Documentar la gestion de medicos del administrador en `docs/admin`.
* **Fase 5 - Gestion global de horarios**
* [x] Crear endpoint para listar disponibilidad de cualquier medico por rango.
* [x] Crear endpoint para crear bloques de disponibilidad para cualquier medico desde backoffice.
* [x] Crear endpoint para editar disponibilidad y bloquear o desbloquear slots mediante cambio de estado.
* [x] Crear endpoint para eliminar disponibilidad cuando el bloque no esta `reservada`.
* [x] Crear la vista `/admin/operacion/horarios` con selector de medico, calendario y editor de bloques.
* [x] Conectar la vista Horarios a `AdminService` y `/api/admin` reales.
* [ ] Mostrar advertencias de impacto sobre solicitudes pendientes o citas futuras mas alla del bloqueo de slots reservados.
* [ ] Documentar la vista de Gestion de horarios del administrador en `docs/admin`.
* **Fase 6 - Gestion de especialidades**
* [x] Crear la vista `/admin/operacion/especialidades` con buscador y estado visual local.
* [ ] Conectar `/admin/operacion/especialidades` a un backend real bajo `/api/admin/especialidades`.
* [ ] Crear endpoints para listar, crear, editar, activar e inactivar especialidades.
* [ ] Persistir acciones de alta, edicion y cambio de estado; hoy la vista usa datos stub.
* [ ] Documentar la vista de Especialidades del administrador en `docs/admin`.
* **Fase 7 - Solicitudes, pacientes, citas y auditoria**
* [ ] Crear cola administrativa para solicitudes pendientes del flujo invitado.
* [ ] Crear operacion global de citas con filtros y acciones administrativas controladas.
* [x] Crear vistas de pacientes del backoffice con ficha administrativa.
* [x] Crear detalle individual de cita dentro del flujo de pacientes del backoffice.
* [x] Documentar la gestion de pacientes del administrador en `docs/admin`.
* [ ] Crear vistas y persistencia de auditoria administrativa.
* [ ] Crear notificaciones y ajustes del administrador.
* **Fase 8 - Seguridad, accesos y cierre**
* [ ] Disenar flujo administrativo de reseteo de contrasena y soporte de acceso.
* [ ] Verificar que ninguna accion sensible carezca de confirmacion explicita y de registro en auditoria.
* [ ] Verificar consistencia transaccional en citas, solicitudes y disponibilidad cuando el modulo crezca.
* [ ] Verificar que el backoffice no exponga datos sensibles fuera de las vistas autorizadas.
* [ ] Ejecutar build del frontend dentro de Docker.
* [ ] Ejecutar lint dentro de Docker.
* [ ] Ejecutar tests del frontend dentro de Docker.
* [ ] Confirmar que cada vista nueva del backoffice tenga su documento propio en `docs/admin`.