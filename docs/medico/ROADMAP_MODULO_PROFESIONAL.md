* **Documento:** Roadmap funcional del modulo profesional de MediConnect.
* **Objetivo:** Definir las vistas, funciones, dependencias y orden de implementacion necesarios para pasar del modulo medico actual a un modulo profesional completo con datos reales.
* **Complemento operativo:** El seguimiento ejecutable del desarrollo vive en CHECKLIST_MODULO_PROFESIONAL.md y debe actualizarse a medida que se cierre cada bloque.
* **Estado actual validado:** Hoy el rol Medico solo tiene la ruta /medico/home con dashboard simple, tabs de citas pasadas o de hoy y proximas, y marcado de asistencia; el backend expone dashboard, citas para marcar, citas proximas y marcado de asistencia; la base ya dispone de medicos, disponibilidad_medica, citas_medicas, historial_atenciones y notificaciones.
* **Hallazgo clave:** La base ya permite agenda, disponibilidad, citas, historial clinico basico y notificaciones, pero todavia no existe una entidad para documentos clinicos ni un flujo del medico para escribir historial_atenciones.
* **Hallazgo clave:** Las solicitudes de invitado crean citas con estado pendiente, sin id_disponibilidad, con datos de contacto en la propia cita y con medico autoasignado; deben tratarse distinto a una reserva confirmada.
* **Decision de navegacion principal:** El modulo profesional debe quedar con un navbar persistente de cuatro entradas: Inicio, Agenda, Pacientes y Perfil; notificaciones debe vivir en el header con badge y acceso a bandeja propia, no como pestana principal.
* **Ruta objetivo:** /medico/home debe conservarse como Inicio para no romper la redireccion por rol ya existente.
* **Ruta objetivo:** /medico/agenda debe concentrar el calendario, el listado por rango y la gestion de disponibilidad.
* **Ruta objetivo:** /medico/citas/:idCita debe resolver el detalle operativo y clinico de cada cita.
* **Ruta objetivo:** /medico/pacientes debe listar la cartera real del profesional.
* **Ruta objetivo:** /medico/pacientes/:idPaciente debe exponer la ficha consolidada del paciente segun la relacion clinica real.
* **Ruta objetivo:** /medico/perfil debe consolidar datos personales, datos profesionales y seguridad de cuenta.
* **Ruta objetivo:** /medico/notificaciones debe existir como bandeja completa o como vista equivalente respaldada por datos reales del backend.
* **Vista Inicio:** Debe reemplazar la pantalla de pruebas y mostrar atenciones del dia, solicitudes pendientes, proximas citas confirmadas, cantidad de pendientes por revisar, badge de no leidas y accesos rapidos a agenda, pacientes y documentos recientes.
* **Vista Inicio:** Debe mantener el marcado de asistencia ya construido, pero integrarlo como una accion de cada cita del dia y como entrada al detalle clinico de la cita.
* **Vista Inicio:** Debe diferenciar tres tipos de trabajo clinico: solicitudes pendientes de invitado, citas confirmadas del dia y citas ya completadas sin historial clinico cargado.
* **Vista Agenda:** Debe permitir cambiar entre dia, semana y mes sin perder el contexto del profesional autenticado.
* **Vista Agenda:** Debe listar citas por rango con filtros por estado_cita, modalidad y texto libre de paciente, y distinguir visualmente pendiente, confirmada, cancelada, reprogramada y completada.
* **Vista Agenda:** Debe mostrar slots de disponibilidad con los estados reales disponibles en la base: disponible, reservada y bloqueada.
* **Vista Agenda:** Debe permitir crear, bloquear, desbloquear, editar y eliminar disponibilidad solo cuando la operacion no rompa una reserva ya tomada; los cambios deben respetar la unicidad actual por medico, fecha y rango horario.
* **Vista Agenda:** Debe separar las solicitudes sin slot real de las reservas confirmadas con id_disponibilidad para evitar tratarlas como si fueran el mismo objeto operativo.
* **Vista Detalle de cita:** Debe centralizar datos de paciente, especialidad, motivo, modalidad, fecha, hora, observaciones administrativas, confirmacion previa del paciente y resultado de asistencia.
* **Vista Detalle de cita:** Debe permitir al profesional registrar o editar diagnostico, tratamiento y observaciones clinicas sobre historial_atenciones porque hoy el paciente ya puede leer esos datos pero el medico aun no tiene flujo de escritura.
* **Vista Detalle de cita:** Debe permitir adjuntar documentos relacionados con la atencion y decidir explicitamente si cada documento es interno del profesional o visible tambien para el paciente.
* **Vista Pacientes:** Debe listar solo pacientes vinculados al profesional por citas reales y ordenarlos desde la ultima interaccion mas reciente hasta la mas antigua, tal como solicitaste.
* **Vista Pacientes:** Debe mostrar nombre, RUT cuando exista, correo, telefono, ultima cita, proxima cita, cantidad de atenciones completadas y estado de relacion clinica; las solicitudes de invitado pendientes no deben mezclarse aqui como pacientes consolidados.
* **Vista Pacientes:** Debe ofrecer busqueda por nombre, apellido, RUT y correo, ademas de filtros minimos por con proxima cita, sin proxima cita y con documentos.
* **Vista Ficha de paciente:** Debe consolidar resumen personal, historial del profesional con ese paciente, documentos cargados, proximas citas, atenciones pasadas y acceso a nueva nota clinica.
* **Vista Ficha de paciente:** Debe restringir el acceso a pacientes que realmente pertenezcan al profesional por asignacion de cita; no basta con conocer el id del paciente.
* **Vista Notificaciones:** Debe consumir notificaciones reales del profesional, marcar las pendientes como leidas al entrar, permitir limpiar la bandeja y navegar hacia la cita o seccion relacionada cuando la estructura de datos lo permita.
* **Vista Notificaciones:** Debe cubrir como minimo estos eventos clinicos: solicitud publica de hora, reserva confirmada por paciente autenticado, cancelacion, reagendamiento, confirmacion anticipada de asistencia y resultado final de asistencia.
* **Gap real de notificaciones:** Hoy el backend ya notifica al medico cuando un paciente cancela una cita y cuando confirma asistencia, pero no le notifica cuando un paciente reserva una hora autenticada, cuando un invitado deja una solicitud o cuando una cita se reagenda.
* **Gap real de notificaciones:** La tabla notificaciones actual solo guarda texto y tipo; si la bandeja debe abrir directamente una cita o una ficha de paciente, habra que extender la estructura con referencias navegables o metadatos equivalentes.
* **Decision pendiente:** Definir si las solicitudes pendientes del flujo invitado pueden ser aceptadas, rechazadas o reasignadas por el profesional, o si ese control seguira fuera del modulo medico.
* **Decision pendiente:** Definir si los documentos adjuntos seran visibles para el paciente, solo para el profesional que los sube o compartidos entre profesionales autorizados.
* **Decision pendiente:** Definir si el perfil profesional tendra foto o avatar persistente, porque la estructura actual no incluye almacenamiento de imagen de perfil.
* **Vista Perfil:** Debe exponer datos reales del profesional tomados desde usuarios, medicos y especialidades: nombre, apellido, correo, telefono, especialidad, numero de registro, anos de experiencia, biografia y estado del perfil.
* **Vista Perfil:** Debe permitir que el profesional edite solo los campos que no comprometen gobierno clinico, como telefono, biografia y preferencias de notificacion; especialidad, numero de registro y estado deberian seguir bajo control administrativo salvo decision contraria documentada.
* **Vista Perfil:** Debe incluir acciones de seguridad equivalentes al modulo paciente, al menos cambio de contrasena, cierre de sesion y acceso a soporte.
* **Funcionalidad transversal:** Se debe crear un header profesional reutilizable con nombre, iniciales o iconografia clinica, badge de notificaciones y acceso consistente a la bandeja.
* **Funcionalidad transversal:** Se debe crear un componente de navegacion profesional equivalente al del paciente para que Inicio, Agenda, Pacientes y Perfil se mantengan estables en todo el modulo.
* **Funcionalidad transversal:** Se debe crear un estado compartido de notificaciones del profesional para evitar badges desincronizados entre vistas cacheadas del ion-router-outlet.
* **Backend requerido:** Extender el modulo medico con endpoints de agenda por rango, detalle de cita, CRUD de disponibilidad, listado de pacientes, ficha de paciente, creacion o edicion de historial clinico, bandeja de notificaciones y perfil del profesional.
* **Backend requerido:** Todas las operaciones deben resolver id_medico desde el JWT y jamas aceptar ese identificador desde el cliente; el patron anti-IDOR ya usado en el modulo actual debe mantenerse en todo el crecimiento del rol.
* **Backend requerido:** La lista de pacientes debe calcularse desde citas_medicas, pacientes, usuarios e historial_atenciones; no hace falta inventar una relacion extra mientras esa derivacion siga cubriendo el caso real.
* **Backend requerido:** Las operaciones de agenda que cambian disponibilidad o citas deben seguir siendo transaccionales para evitar dobles reservas, perdida de slots o sobrescritura de estados.
* **Base de datos requerida:** La estructura actual ya soporta agenda, citas, disponibilidad, historial clinico basico y notificaciones.
* **Base de datos requerida:** Para documentos clinicos se necesita una nueva estructura de metadatos y una estrategia de almacenamiento persistente fuera del ciclo efimero del contenedor; hoy no existe tabla ni almacenamiento preparado para adjuntos.
* **Base de datos requerida:** Si el producto necesita deep links desde notificaciones o auditoria clinica de cambios, sera necesario ampliar la persistencia con referencias a cita, paciente, tipo de evento, autor y fecha de accion.
* **Seguridad obligatoria:** Todo endpoint nuevo del profesional debe quedar bajo autenticacion JWT, validacion de rol Medico, consultas parametrizadas y validacion estricta de entrada.
* **Seguridad obligatoria:** Los documentos adjuntos deben validarse por tamano, tipo MIME, extension permitida, nombre normalizado y autorizacion del profesional sobre ese paciente antes de aceptar la carga.
* **Seguridad obligatoria:** No se deben exponer datos sensibles de pacientes en listados amplios mas alla de lo necesario para la operacion clinica; los detalles completos deben vivir en la ficha y no en cada resultado de agenda.
* **Seguridad obligatoria:** El frontend Angular debe tratar toda respuesta como dato no confiable, evitar HTML inyectado, no guardar informacion clinica sensible en localStorage y no transportar decisiones de autorizacion en query params.
* **Orden recomendado de implementacion:** Primero convertir la pantalla actual del medico en un Inicio real y agregar el shell visual compartido del modulo profesional.
* **Orden recomendado de implementacion:** Segundo construir la bandeja de notificaciones del profesional y completar en backend los eventos faltantes de reserva, solicitud y reagendamiento.
* **Orden recomendado de implementacion:** Tercero construir Agenda con vistas dia, semana y mes junto con CRUD de disponibilidad sobre disponibilidad_medica.
* **Orden recomendado de implementacion:** Cuarto crear el detalle de cita profesional y habilitar el registro de historial_atenciones desde ese punto.
* **Orden recomendado de implementacion:** Quinto construir Mis pacientes y la ficha individual enlazada desde agenda y desde el listado.
* **Orden recomendado de implementacion:** Sexto disenar e implementar la carga de documentos clinicos solo despues de cerrar almacenamiento persistente, permisos y reglas de visibilidad.
* **Orden recomendado de implementacion:** Septimo cerrar Perfil profesional, seguridad de cuenta y pruebas de regresion del rol Medico.
* **Criterio de cierre funcional:** El modulo profesional estara realmente completo cuando pueda recibir solicitudes y reservas en tiempo real, administrar agenda sin romper integridad, abrir la ficha de cualquier paciente propio, registrar la atencion, adjuntar documentos y mantener su perfil con datos reales.
* **Regla documental:** Cada vista nueva del profesional que se implemente desde este roadmap debe quedar documentada en docs/medico con su propio archivo funcional, del mismo modo que ya ocurre en paciente.