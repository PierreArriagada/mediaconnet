* **Documento:** Checklist operativo del modulo profesional de MediConnect.
* **Objetivo:** Permitir seguimiento claro del desarrollo del rol profesional, marcando lo que ya fue implementado y lo que todavia falta resolver.
* **Regla de uso:** Cada punto se marca solo cuando la funcionalidad queda operativa con datos reales, seguridad aplicada, rutas conectadas y documentacion actualizada.
* **Relacion documental:** Este checklist aterriza el alcance definido en ROADMAP_MODULO_PROFESIONAL.md y debe mantenerse sincronizado con ese documento.
* **Fase 0 - Definiciones bloqueantes**
* [ ] Definir si las solicitudes de invitado se aceptan, rechazan, reasignan o solo se visualizan desde el modulo profesional.
* [ ] Definir si los documentos clinicos seran visibles para el paciente, solo para el profesional autor o compartidos entre profesionales autorizados.
* [ ] Definir si las notificaciones del profesional necesitan abrir una cita o una ficha de paciente mediante referencias navegables persistidas en base de datos.
* [ ] Definir si el perfil profesional tendra avatar o foto persistente.
* **Fase 1 - Shell base del modulo profesional**
* [x] Crear header profesional reutilizable con nombre, identidad visual clinica, badge de notificaciones y acceso a la bandeja.
* [x] Crear barra de navegacion profesional con Inicio, Agenda, Pacientes y Perfil.
* [x] Crear estado compartido de notificaciones del profesional para evitar desincronizacion entre vistas cacheadas.
* [ ] Extender el arbol de rutas del modulo medico con home, agenda, citas, pacientes, ficha de paciente, perfil y notificaciones.
* [ ] Ajustar la redireccion por rol para conservar /medico/home como punto de entrada del profesional.
* [x] Documentar el shell visual del modulo profesional en docs/medico.
* **Fase 2 - Vista Inicio del profesional**
* [ ] Reemplazar la pantalla de pruebas actual por un Inicio operativo del profesional.
* [ ] Mostrar atenciones del dia con datos reales.
* [ ] Mostrar solicitudes pendientes del flujo invitado como bloque separado de las reservas confirmadas.
* [ ] Mostrar proximas citas confirmadas y pendientes de revision clinica.
* [ ] Mostrar contador de pendientes por marcar asistencia.
* [ ] Mantener la accion de marcar asistencia ya construida dentro del nuevo Inicio.
* [ ] Permitir navegar desde cada tarjeta al detalle completo de la cita.
* [ ] Agregar accesos rapidos a Agenda, Pacientes y Notificaciones.
* [ ] Documentar la vista Inicio del profesional en docs/medico.
* **Fase 3 - Notificaciones del profesional**
* [ ] Crear endpoint para listar notificaciones del profesional autenticado.
* [ ] Crear endpoint para marcar notificaciones como leidas usando id_usuario desde el JWT.
* [ ] Crear endpoint para limpiar la bandeja del profesional.
* [ ] Crear vista /medico/notificaciones con listado, marcado de lectura y limpieza total.
* [ ] Mostrar badge de no leidas sincronizado entre header, Inicio, Agenda, Pacientes y Perfil.
* [ ] Generar notificacion al profesional cuando un paciente autenticado reserva una hora.
* [ ] Generar notificacion al profesional cuando un invitado registra una solicitud.
* [ ] Generar notificacion al profesional cuando una cita se reagenda.
* [ ] Mantener y validar las notificaciones ya existentes por cancelacion, confirmacion de asistencia y marcado final de asistencia.
* [ ] Definir e implementar metadatos navegables si la bandeja debe abrir pantallas especificas.
* [ ] Documentar la vista Notificaciones del profesional en docs/medico.
* **Fase 4 - Agenda y disponibilidad**
* [ ] Crear endpoint de agenda del profesional con consulta por dia, semana y mes.
* [ ] Agregar filtros por estado de cita, modalidad y texto libre de paciente.
* [ ] Crear endpoint para listar disponibilidad medica por rango y estado.
* [ ] Crear endpoint para crear nuevos bloques de disponibilidad.
* [ ] Crear endpoint para editar bloques de disponibilidad sin romper reservas tomadas.
* [ ] Crear endpoint para bloquear y desbloquear slots existentes.
* [ ] Crear endpoint para eliminar disponibilidad solo cuando no exista una reserva asociada.
* [ ] Construir la vista Agenda con cambio de rango dia, semana y mes.
* [ ] Separar visualmente solicitudes pendientes sin id_disponibilidad de las reservas confirmadas con slot real.
* [ ] Mostrar estados disponibles, reservadas y bloqueadas con semantica visual estable.
* [ ] Permitir abrir el detalle de la cita desde la agenda.
* [ ] Validar transacciones y restricciones de unicidad sobre disponibilidad_medica.
* [ ] Documentar la vista Agenda del profesional en docs/medico.
* **Fase 5 - Detalle de cita e historial clinico**
* [ ] Crear endpoint de detalle de cita del profesional con validacion de pertenencia por medico autenticado.
* [ ] Mostrar datos completos de paciente, especialidad, modalidad, fecha, hora, motivo, observaciones, confirmacion previa y resultado de asistencia.
* [ ] Crear endpoint para crear historial_atenciones desde el profesional.
* [ ] Crear endpoint para editar historial_atenciones existente cuando el flujo clinico lo permita.
* [ ] Registrar diagnostico, tratamiento y observaciones clinicas desde la vista de detalle.
* [ ] Mostrar si la cita ya tiene historial clinico cargado o sigue pendiente.
* [ ] Mantener anti-IDOR resolviendo siempre el id_medico desde el JWT.
* [ ] Definir si se necesita auditoria clinica de cambios sobre historial_atenciones.
* [ ] Documentar la vista de detalle de cita del profesional en docs/medico.
* **Fase 6 - Mis pacientes y ficha individual**
* [ ] Crear endpoint para listar pacientes vinculados al profesional por citas reales.
* [ ] Ordenar la lista desde la ultima interaccion mas reciente hacia la mas antigua.
* [ ] Excluir solicitudes de invitado pendientes del listado de pacientes consolidados.
* [ ] Mostrar en la lista nombre, RUT cuando exista, correo, telefono, ultima cita, proxima cita, total de atenciones y estado de relacion clinica.
* [ ] Incorporar busqueda por nombre, apellido, RUT y correo.
* [ ] Incorporar filtros minimos por con proxima cita, sin proxima cita y con documentos.
* [ ] Crear endpoint de ficha individual del paciente restringido a pacientes realmente asignados al profesional.
* [ ] Mostrar en la ficha resumen personal, historial del profesional con ese paciente, proximas citas, atenciones pasadas y documentos asociados.
* [ ] Permitir crear una nueva nota clinica desde la ficha del paciente.
* [ ] Documentar la vista Pacientes del profesional en docs/medico.
* [ ] Documentar la ficha individual del paciente en docs/medico.
* **Fase 7 - Documentos clinicos**
* [ ] Definir almacenamiento persistente para adjuntos fuera del ciclo efimero del contenedor.
* [ ] Crear estructura de base de datos para metadatos de documentos clinicos.
* [ ] Definir permisos de visibilidad por documento.
* [ ] Crear endpoint seguro para carga de documentos.
* [ ] Crear endpoint para listar documentos por paciente y por cita.
* [ ] Crear endpoint para eliminar o despublicar documentos segun reglas de negocio.
* [ ] Validar tamano, tipo MIME, extension permitida y autorizacion del profesional sobre el paciente.
* [ ] Integrar carga y consulta de documentos desde el detalle de cita y desde la ficha del paciente.
* [ ] Documentar el flujo de documentos clinicos del profesional en docs/medico.
* **Fase 8 - Perfil profesional y seguridad**
* [ ] Crear endpoint de perfil del profesional con datos reales de usuarios, medicos y especialidades.
* [ ] Crear endpoint para actualizar telefono, biografia y preferencias de notificacion si esos campos quedan habilitados para autoedicion.
* [ ] Definir si especialidad, numero de registro y estado son solo administrables por backoffice.
* [ ] Construir la vista /medico/perfil con datos reales del profesional.
* [ ] Incorporar acciones de cambio de contrasena, soporte y cierre de sesion.
* [ ] Incorporar avatar o identificacion visual segun la decision tomada en la fase 0.
* [ ] Documentar la vista Perfil del profesional en docs/medico.
* **Fase 9 - Validacion y cierre**
* [ ] Verificar que ningun endpoint nuevo acepte id_medico desde el cliente.
* [ ] Verificar que las operaciones de agenda y cita sensibles sigan siendo transaccionales.
* [ ] Verificar que no se exponga informacion clinica sensible fuera de las vistas autorizadas.
* [ ] Verificar que el frontend no persista informacion clinica sensible en almacenamiento local inseguro.
* [ ] Ejecutar build del frontend dentro de Docker.
* [ ] Ejecutar lint dentro de Docker.
* [ ] Ejecutar tests del frontend dentro de Docker.
* [ ] Actualizar el checklist marcando lo efectivamente completado.
* [ ] Confirmar que cada vista nueva tenga su documento propio en docs/medico.