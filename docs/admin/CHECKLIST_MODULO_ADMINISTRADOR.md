* **Documento:** Checklist operativo del modulo administrador de MediConnect.
* **Objetivo:** Permitir seguimiento claro del desarrollo del backoffice, marcando lo que ya fue implementado y lo que todavia falta resolver para el rol Administrador.
* **Regla de uso:** Cada punto se marca solo cuando la funcionalidad queda operativa con datos reales, seguridad aplicada, rutas conectadas, comportamiento validado y documentacion actualizada.
* **Relacion documental:** Este checklist aterriza el alcance definido en ROADMAP_MODULO_ADMINISTRADOR.md y debe mantenerse sincronizado con ese documento.
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
* [x] Extender el arbol de rutas del frontend con /admin/home segun corresponda.
* [x] Ajustar la redireccion por rol para que Administrador deje de caer en el dashboard generico y entre al modulo admin real.
* [ ] Crear modulo backend `admin` con controlador, rutas y montaje real en `/api/admin`.
* [ ] Proteger todas las rutas admin con JWT y `requireRole('Administrador')`.
* [x] Documentar el shell visual del administrador en docs/admin.
* **Fase 2 - Inicio del administrador**
* [x] Reemplazar el dashboard generico actual para el Administrador por una vista Inicio operativa.
* [ ] Mostrar resumen del sistema con citas del dia, solicitudes pendientes, medicos activos e inactivos, especialidades inactivas y alertas criticas.
* [ ] Mostrar accesos rapidos a alta de medico, revision de solicitudes, gestion de especialidades, auditoria reciente y operacion de agenda.
* [ ] Separar visualmente indicadores clinicos, indicadores de cuentas y alertas de seguridad.
* [ ] Crear endpoint de dashboard admin con datos reales del sistema.
* [x] Documentar la vista Inicio del administrador en docs/admin.
* **Fase 3 - Solicitudes pendientes del flujo invitado**
* [ ] Crear endpoint para listar solicitudes pendientes del flujo invitado con filtros por fecha, especialidad, medico, paciente y estado.
* [ ] Crear endpoint para revisar una solicitud pendiente en detalle.
* [ ] Crear endpoint para confirmar una solicitud y asignarle un slot real de disponibilidad.
* [ ] Crear endpoint para reprogramar o reasignar una solicitud pendiente.
* [ ] Crear endpoint para cancelar solicitudes pendientes con motivo administrativo.
* [ ] Crear cola administrativa en /admin/operacion/solicitudes que resuelva el estado “En revision” ya sugerido al paciente.
* [ ] Mostrar impacto sobre medico, especialidad y disponibilidad antes de confirmar una asignacion.
* [ ] Generar notificaciones operativas necesarias cuando una solicitud cambie de estado.
* [ ] Mantener transacciones cuando una accion toque solicitud, cita, disponibilidad y notificaciones al mismo tiempo.
* [ ] Documentar la vista de Solicitudes pendientes en docs/admin.
* **Fase 4 - Gestion de medicos**
* [ ] Crear endpoint para listar medicos con filtros por especialidad, estado, carga de agenda, texto libre y disponibilidad futura.
* [ ] Crear endpoint para alta completa de medico generando `usuarios` y `medicos` en una sola transaccion.
* [ ] Crear endpoint para editar informacion de usuario y perfil profesional del medico.
* [ ] Crear endpoint para activar, inactivar, bloquear acceso y reactivar medicos.
* [ ] Definir y aplicar la politica de archivo o eliminacion fisica de medicos segun historial operativo real.
* [ ] Crear vista /admin/medicos con tabla, filtros, busqueda y acciones rapidas.
* [ ] Crear vista /admin/medicos/nuevo con formulario completo y validaciones reales.
* [ ] Crear vista /admin/medicos/:idMedico con informacion profesional, agenda, solicitudes pendientes y eventos administrativos recientes.
* [ ] Mostrar advertencias cuando un cambio de estado del medico impacte citas futuras o solicitudes pendientes.
* [ ] Permitir navegar desde el detalle del medico hacia horarios, citas y auditoria relacionada.
* [ ] Documentar la vista Medicos del administrador en docs/admin.
* [ ] Documentar la vista Detalle de medico en docs/admin.
* **Fase 5 - Gestion de accesos y reseteo de contrasenas**
* [ ] Diseñar el flujo administrativo de reseteo de contrasena sin depender del `forgot-password` actual.
* [ ] Crear estructura segura para tokens de un solo uso, cambio obligatorio o mecanismo equivalente definido por seguridad.
* [ ] Crear endpoint para restablecer acceso de medico o usuario administrado con auditoria obligatoria.
* [ ] Crear endpoint para bloquear y desbloquear cuentas de usuario desde backoffice.
* [ ] Crear interfaz administrativa para soporte de acceso desde Medicos y Pacientes cuando corresponda.
* [ ] Validar que ninguna respuesta, log o toast exponga contrasenas o hashes.
* [ ] Documentar el flujo de reseteo administrativo de accesos en docs/admin.
* **Fase 6 - Gestion de pacientes**
* [ ] Crear endpoint para listar pacientes registrados y pacientes vinculados a solicitudes de invitado cuando aplique.
* [ ] Mostrar nombre, RUT, correo, telefono, estado de cuenta, ultima cita, proxima cita, origen del registro y alertas operativas.
* [ ] Incorporar busqueda por nombre, apellido, RUT y correo.
* [ ] Incorporar filtros por estado de cuenta, con solicitudes pendientes, con citas proximas y con incidencias.
* [ ] Crear endpoint para detalle administrativo del paciente combinando `usuarios`, `pacientes`, citas, solicitudes y notificaciones.
* [ ] Definir si el administrador puede editar datos del paciente y bajo que reglas de auditoria.
* [ ] Crear vista /admin/pacientes con tabla, filtros y acceso a ficha individual.
* [ ] Crear vista /admin/pacientes/:idPaciente con ficha administrativa completa y acciones de soporte autorizadas.
* [ ] Documentar la vista Pacientes del administrador en docs/admin.
* [ ] Documentar la vista Detalle de paciente en docs/admin.
* **Fase 7 - Operacion global de citas**
* [ ] Crear endpoint para listar todas las citas del sistema con contexto de paciente, medico, especialidad y origen.
* [ ] Crear filtros globales por fecha, estado de cita, modalidad, medico, paciente, especialidad y tipo de origen.
* [ ] Crear endpoint para ver detalle administrativo de una cita desde backoffice.
* [ ] Crear endpoint para acciones administrativas controladas sobre citas: confirmar, cancelar, reagendar y reasignar.
* [ ] Mantener transacciones cuando una accion admin afecte disponibilidad, cita y notificaciones.
* [ ] Crear vista /admin/operacion/citas con tabla global, filtros y acciones controladas.
* [ ] Integrar acceso al detalle de cita y a la ficha de medico o paciente relacionados.
* [ ] Documentar la vista de Citas globales del administrador en docs/admin.
* **Fase 8 - Gestion global de horarios**
* [ ] Crear endpoint para listar disponibilidad de cualquier medico por rango y por estado.
* [ ] Crear endpoint para crear bloques de disponibilidad para cualquier medico desde backoffice.
* [ ] Crear endpoint para editar disponibilidad sin romper reservas existentes.
* [ ] Crear endpoint para bloquear y desbloquear slots globalmente.
* [ ] Crear endpoint para eliminar disponibilidad solo cuando no exista reserva asociada y la regla lo permita.
* [ ] Crear vista de gestion global de horarios dentro de /admin/operacion.
* [ ] Mostrar advertencias cuando una accion deje solicitudes sin capacidad de asignacion o impacte citas futuras.
* [ ] Validar la unicidad por medico, fecha y rango horario sobre disponibilidad_medica.
* [ ] Documentar la vista de Gestion de horarios del administrador en docs/admin.
* **Fase 9 - Gestion de especialidades**
* [ ] Crear endpoint para listar especialidades activas e inactivas con conteos de uso real.
* [ ] Crear endpoint para alta de especialidades.
* [ ] Crear endpoint para edicion de nombre, descripcion y estado de especialidades.
* [ ] Crear endpoint para activacion e inactivacion logica de especialidades.
* [ ] Definir y bloquear el borrado fisico por defecto cuando existan medicos o citas asociadas.
* [ ] Crear vista /admin/operacion/especialidades con tabla, filtros y validaciones de impacto.
* [ ] Mostrar cuantos medicos y cuantas citas dependen de cada especialidad antes de confirmar cambios sensibles.
* [ ] Documentar la vista de Especialidades del administrador en docs/admin.
* **Fase 10 - Auditoria y trazabilidad**
* [ ] Diseñar la estructura de base de datos para auditoria administrativa persistida.
* [ ] Crear tabla o bitacora con actor, entidad, accion, resultado, fecha y contexto funcional.
* [ ] Registrar cambios sobre usuarios, medicos, pacientes, especialidades, disponibilidad, citas, reseteos de acceso y ajustes administrativos.
* [ ] Registrar tanto acciones manuales del administrador como eventos automaticos relevantes para seguridad u operacion.
* [ ] Crear endpoint para listar auditoria con filtros por actor, entidad, accion, fecha y resultado.
* [ ] Crear vista /admin/auditoria con busqueda y filtros operativos.
* [ ] Enlazar auditoria contextual desde Medicos, Pacientes, Operacion y Ajustes cuando corresponda.
* [ ] Documentar la vista de Auditoria del administrador en docs/admin.
* **Fase 11 - Notificaciones del administrador**
* [ ] Crear endpoint para listar notificaciones del administrador autenticado.
* [ ] Crear endpoint para marcar notificaciones como leidas.
* [ ] Crear endpoint para limpiar la bandeja administrativa.
* [ ] Crear vista /admin/notificaciones si el shell final la requiere como bandeja completa.
* [ ] Sincronizar badge de no leidas entre header, Inicio, Medicos, Pacientes, Operacion y Auditoria.
* [ ] Generar notificaciones para solicitudes pendientes, conflictos de agenda, cambios de estado de medicos, errores operativos y eventos de soporte relevantes.
* [ ] Definir e implementar metadatos navegables si la bandeja debe abrir entidades concretas.
* [ ] Documentar la vista Notificaciones del administrador en docs/admin.
* **Fase 12 - Ajustes y seguridad del administrador**
* [ ] Crear endpoint de perfil del administrador con datos reales del usuario autenticado.
* [ ] Crear endpoint para cambio de contrasena del propio administrador.
* [ ] Crear endpoint para preferencias de notificacion si se habilitan en el producto.
* [ ] Crear vista /admin/ajustes con perfil, seguridad, cierre de sesion, preferencias y soporte.
* [ ] Definir si el administrador tendra avatar o solo identidad tipografica en el header.
* [ ] Documentar la vista Ajustes del administrador en docs/admin.
* **Fase 13 - Validacion y cierre**
* [ ] Verificar que todas las rutas admin esten realmente montadas en `/api/admin` y protegidas por rol Administrador.
* [ ] Verificar que ninguna accion sensible carezca de confirmacion explicita y de registro en auditoria.
* [ ] Verificar que las operaciones sobre citas, solicitudes y disponibilidad mantengan consistencia transaccional.
* [ ] Verificar que el backoffice no use borrados fisicos por defecto sobre entidades con historia operativa o clinica.
* [ ] Verificar que no se expongan datos sensibles fuera de las vistas autorizadas del backoffice.
* [ ] Verificar que el frontend no persista informacion sensible del backoffice en almacenamiento inseguro.
* [ ] Ejecutar build del frontend dentro de Docker.
* [ ] Ejecutar lint dentro de Docker.
* [ ] Ejecutar tests del frontend dentro de Docker.
* [ ] Actualizar el checklist marcando lo efectivamente completado.
* [ ] Confirmar que cada vista nueva del backoffice tenga su documento propio en docs/admin.