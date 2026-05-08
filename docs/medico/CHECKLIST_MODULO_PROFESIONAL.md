* **Documento:** Checklist operativo del modulo profesional de MediConnect.
* **Objetivo:** Permitir seguimiento claro del desarrollo del rol profesional, marcando lo que ya fue implementado y lo que todavia falta resolver.
* **Regla de uso:** Cada punto se marca solo cuando la funcionalidad queda operativa con datos reales, seguridad aplicada, rutas conectadas y documentacion actualizada.
* **Relacion documental:** Este checklist aterriza el alcance definido en ROADMAP_MODULO_PROFESIONAL.md y debe mantenerse sincronizado con ese documento.
* **Estado sincronizado:** Validado contra rutas, servicios y backend reales del repositorio al 2026-05-07 durante la auditoria de codigo medico.
* **Fase 0 - Definiciones bloqueantes**
* [ ] Definir si las solicitudes de invitado se aceptan, rechazan, reasignan o solo se visualizan desde el modulo profesional.
* [ ] Definir si los documentos clinicos seran visibles para el paciente, solo para el profesional autor o compartidos entre profesionales autorizados.
* [ ] Definir si las notificaciones del profesional necesitan abrir una cita o una ficha de paciente mediante referencias navegables persistidas en base de datos.
* [x] Definir si el perfil profesional tendra avatar o foto persistente. Estado actual: existe foto persistente via `usuarios.foto_perfil_url` y `POST /api/medico/perfil/foto`.
* **Fase 1 - Shell base del modulo profesional**
* [x] Crear header profesional reutilizable con nombre, identidad visual clinica, badge de notificaciones y acceso a la bandeja.
* [x] Crear barra de navegacion profesional con Inicio, Agenda, Pacientes y Perfil.
* [x] Crear estado compartido de notificaciones del profesional para evitar desincronizacion entre vistas cacheadas.
* [x] Extender el arbol de rutas del modulo medico con home, agenda, citas, pacientes, ficha de paciente, perfil y notificaciones.
* [x] Ajustar la redireccion por rol para conservar `/medico/home` como punto de entrada del profesional.
* [x] Documentar el shell visual del modulo profesional en `docs/medico`.
* **Fase 2 - Vista Inicio del profesional**
* [x] Reemplazar la pantalla de pruebas anterior por un Inicio operativo del profesional.
* [x] Mostrar atenciones del dia y metricas reales desde `GET /api/medico/dashboard`.
* [x] Mostrar proxima cita y listado de proximas citas desde backend real.
* [x] Mostrar contador de pendientes por marcar asistencia.
* [x] Mantener la accion de marcar asistencia con confirmacion modal dentro del Inicio.
* [x] Agregar accesos rapidos a Agenda, Pacientes y Notificaciones.
* [ ] Mostrar solicitudes pendientes del flujo invitado como bloque separado de las reservas confirmadas.
* [x] Abrir un detalle clinico real desde cada tarjeta mediante `/medico/citas/:idCita`.
* [x] Documentar la vista Inicio del profesional en `docs/medico`.
* **Fase 3 - Notificaciones del profesional**
* [x] Crear endpoint para listar notificaciones del profesional autenticado.
* [x] Crear endpoint para marcar una notificacion como leida o no leida usando el usuario del JWT.
* [x] Crear endpoint para eliminar una notificacion individual del profesional autenticado.
* [x] Crear vista `/medico/notificaciones` con carga real, error, toggle de lectura y eliminacion individual.
* [x] Sincronizar el contador del header con un estado compartido al operar desde la bandeja.
* [ ] Precargar el badge de no leidas en todo el modulo sin depender de abrir la bandeja primero.
* [x] Crear endpoint para limpieza total de la bandeja del profesional.
* [ ] Generar notificaciones faltantes para reserva autenticada, solicitud de invitado y reagendamiento.
* [ ] Definir e implementar metadatos navegables si la bandeja debe abrir pantallas especificas.
* [ ] Documentar la vista Notificaciones del profesional en `docs/medico`.
* **Fase 4 - Agenda y disponibilidad**
* [x] Montar la vista `/medico/agenda` dentro del modulo medico.
* [x] Agregar filtros de estado de cita, modalidad y texto libre en frontend.
* [x] Crear endpoint para listar disponibilidad medica por rango del profesional autenticado.
* [x] Crear endpoint para crear nuevos bloques de disponibilidad.
* [x] Crear endpoint para actualizar bloques de disponibilidad.
* [x] Crear endpoint para bloquear y desbloquear slots existentes mediante cambio de estado.
* [x] Crear endpoint para eliminar disponibilidad cuando no exista una reserva asociada.
* [ ] Terminar la experiencia de vista `dia`; hoy la operacion real esta centrada en semana y mes.
* [ ] Separar visualmente solicitudes de invitado pendientes de reservas confirmadas, aunque ambas puedan tener `id_disponibilidad`.
* [x] Permitir abrir un detalle clinico real de la cita desde la agenda.
* [ ] Documentar la vista Agenda del profesional en `docs/medico`.
* **Fase 5 - Detalle de cita e historial clinico**
* [x] Implementar una ruta y pagina real de detalle de cita para el profesional.
* [x] Crear endpoint de detalle de cita del profesional con validacion de pertenencia por medico autenticado.
* [x] Crear flujo para registrar o editar `historial_atenciones` desde el modulo medico.
* [x] Mostrar si la cita ya tiene historial clinico cargado o sigue pendiente.
* [ ] Definir si se necesita auditoria clinica de cambios sobre historial_atenciones.
* [x] Documentar la vista de detalle de cita del profesional en `docs/medico`.
* **Fase 6 - Pacientes y ficha individual**
* [x] Crear endpoint para listar pacientes vinculados al profesional por citas reales.
* [x] Crear endpoint de ficha individual del paciente restringido a pacientes realmente asignados al profesional.
* [x] Construir la vista `/medico/pacientes` con carga real y acceso a ficha individual.
* [x] Construir la ruta `/medico/pacientes/:id/ficha` con datos del backend.
* [ ] Ordenar la lista desde la ultima interaccion mas reciente hacia la mas antigua; hoy se ordena alfabeticamente.
* [ ] Incorporar busqueda y filtros al listado de pacientes.
* [ ] Mostrar en la lista proxima cita, total de atenciones y estado de relacion clinica.
* [ ] Permitir crear una nueva nota clinica desde la ficha del paciente.
* [ ] Documentar la vista Pacientes del profesional y la ficha individual en `docs/medico`.
* **Fase 7 - Perfil profesional y seguridad**
* [x] Crear endpoint de perfil del profesional con datos reales de usuarios, medicos y especialidades.
* [x] Construir la vista `/medico/perfil` con datos reales del profesional.
* [x] Incorporar cierre de sesion desde la vista Perfil.
* [x] Mover la carga del perfil a `MedicoService` y `environment.apiUrl`.
* [x] Incorporar cambio de contrasena, soporte y preferencias basicas de notificacion local.
* [x] Incorporar avatar persistente o definicion equivalente segun la fase 0.
* [ ] Documentar la vista Perfil del profesional en `docs/medico`.
* **Fase 8 - Documentos clinicos**
* [ ] Definir almacenamiento persistente para adjuntos fuera del ciclo efimero del contenedor.
* [ ] Crear estructura de base de datos para metadatos de documentos clinicos.
* [ ] Crear endpoints seguros para carga, listado y retiro de documentos.
* [ ] Integrar carga y consulta de documentos desde el detalle de cita y desde la ficha del paciente.
* [ ] Documentar el flujo de documentos clinicos del profesional en `docs/medico`.
* **Fase 9 - Validacion y cierre**
* [ ] Verificar que ningun endpoint nuevo acepte `id_medico` desde el cliente.
* [ ] Verificar que las operaciones sensibles de agenda y cita sigan siendo transaccionales donde corresponda.
* [ ] Verificar que no se exponga informacion clinica sensible fuera de las vistas autorizadas.
* [ ] Verificar que el frontend no persista informacion clinica sensible en almacenamiento local inseguro.
* [ ] Ejecutar build del frontend dentro de Docker.
* [ ] Ejecutar lint dentro de Docker.
* [ ] Ejecutar tests del frontend dentro de Docker.
* [ ] Confirmar que cada vista nueva tenga su documento propio en `docs/medico`.
