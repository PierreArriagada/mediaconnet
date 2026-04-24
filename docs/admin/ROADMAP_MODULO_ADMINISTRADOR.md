* **Documento:** Roadmap funcional del modulo administrador de MediConnect.
* **Objetivo:** Definir las vistas, funciones, dependencias, restricciones y orden de implementacion necesarios para construir un backoffice real de Administrador alineado con los modulos Paciente y Medico ya existentes.
* **Complemento operativo:** El seguimiento ejecutable del desarrollo vive en CHECKLIST_MODULO_ADMINISTRADOR.md y debe actualizarse a medida que se cierre cada bloque.
* **Estado actual validado:** Hoy no existe modulo admin en frontend ni en backend; el usuario con rol Administrador cae en el dashboard generico y la API no monta rutas /api/admin aunque la infraestructura de autorizacion por rol ya soporta `requireRole('Administrador')`.
* **Estado actual validado:** La base ya dispone de roles, usuarios, pacientes, medicos, especialidades, disponibilidad_medica, citas_medicas, historial_atenciones y notificaciones, por lo que el backoffice puede construirse sobre datos reales sin inventar nuevas entidades para la operacion basica.
* **Hallazgo clave:** El flujo de solicitud de hora invitado ya existe y crea citas `pendiente` con `es_invitado = TRUE`, sin `id_disponibilidad`, con medico autoasignado y con una experiencia de paciente que habla de una revision por el equipo; hoy no existe un modulo admin que resuelva esa revision.
* **Hallazgo clave:** La base soporta desactivacion logica en `usuarios.estado`, `medicos.estado` y `especialidades.estado`; por las llaves foraneas actuales, eliminar fisicamente medicos, especialidades o historiales operativos no debe ser el comportamiento por defecto del administrador.
* **Hallazgo clave:** No existe hoy persistencia para auditoria, reseteo administrativo de contrasenas, preferencias de admin, metadatos navegables de notificaciones ni jerarquias internas de permisos administrativos.
* **Decision de navegacion principal:** El modulo admin necesita un shell mas amplio que Paciente y Medico; se recomienda un navbar persistente de cinco entradas: Inicio, Medicos, Pacientes, Operacion y Auditoria.
* **Decision de navegacion principal:** Notificaciones y Ajustes del administrador deben vivir en el header o en un menu secundario, no en el navbar principal, para no desplazar modulos operativos mas criticos.
* **Decision de navegacion principal:** Si mas adelante especialidades y configuraciones crecen demasiado, Operacion puede dividirse en Catalogos y Agenda global sin romper el shell inicial.
* **Ruta objetivo:** /admin/home debe ser la entrada principal del backoffice y reemplazar el dashboard generico actual para el rol Administrador.
* **Ruta objetivo:** /admin/medicos debe concentrar el listado global y las acciones de gestion del cuerpo medico.
* **Ruta objetivo:** /admin/medicos/nuevo debe soportar el alta completa de un medico con usuario, perfil profesional y configuracion inicial.
* **Ruta objetivo:** /admin/medicos/:idMedico debe exponer el detalle administrativo del medico, su informacion profesional, su agenda y sus acciones de soporte.
* **Ruta objetivo:** /admin/pacientes debe concentrar la revision de pacientes, solicitudes vinculadas y estado de sus cuentas.
* **Ruta objetivo:** /admin/pacientes/:idPaciente debe exponer la ficha administrativa del paciente con sus datos reales y contexto clinico visible para soporte.
* **Ruta objetivo:** /admin/operacion debe funcionar como centro operativo para citas, solicitudes pendientes, horarios globales y catalogos clinicos.
* **Ruta objetivo:** /admin/operacion/citas debe listar y filtrar todas las citas del sistema con contexto de paciente, medico y especialidad.
* **Ruta objetivo:** /admin/operacion/solicitudes debe concentrar las solicitudes pendientes del flujo invitado y cualquier otra cita que requiera revision administrativa.
* **Ruta objetivo:** /admin/operacion/especialidades debe gestionar el catalogo de especialidades activas e inactivas.
* **Ruta objetivo:** /admin/auditoria debe exponer la trazabilidad de cambios sensibles del sistema.
* **Ruta objetivo:** /admin/notificaciones debe existir como bandeja de alertas administrativas si el header requiere una vista completa de seguimiento.
* **Ruta objetivo:** /admin/ajustes debe concentrar perfil, seguridad, preferencias y soporte del usuario administrador.
* **Vista Inicio:** Debe mostrar resumen operativo del sistema completo con citas del dia, solicitudes pendientes de revision, medicos activos e inactivos, pacientes con incidencias, especialidades inactivas y alertas criticas del dia.
* **Vista Inicio:** Debe incluir accesos rapidos a revision de solicitudes, alta de medico, gestion de especialidades, auditoria reciente y cola de incidencias de agenda.
* **Vista Inicio:** Debe separar claramente indicadores clinicos, indicadores de cuentas y alertas de seguridad para que el administrador no mezcle soporte operativo con supervision de datos.
* **Vista Medicos:** Debe listar todos los medicos con filtros por especialidad, estado, carga de agenda, texto libre y disponibilidad futura.
* **Vista Medicos:** Debe permitir crear medico desde cero generando el usuario en `usuarios` y el perfil en `medicos` dentro de una transaccion unica.
* **Vista Medicos:** Debe permitir editar nombre, apellido, correo, telefono, especialidad, numero de registro, anos de experiencia, biografia y estado administrativo del medico segun los campos reales existentes.
* **Vista Medicos:** Debe permitir activar, inactivar, bloquear acceso, reactivar y archivar logicamente al medico; eliminar fisicamente solo deberia contemplarse si no existe historia operativa y la regla queda documentada de forma explicita.
* **Vista Medicos:** Debe permitir gestionar horarios y disponibilidad del medico desde su ficha o desde una seccion operativa enlazada, sin romper reservas ya tomadas.
* **Vista Medicos:** Debe permitir restablecer la contrasena del medico o de su usuario asociado mediante un flujo seguro, auditable y sin exponer contrasenas en texto plano en la interfaz o en los logs.
* **Vista Detalle de medico:** Debe consolidar informacion del usuario, perfil profesional, especialidad, disponibilidad, proximas citas, citas historicas, solicitudes pendientes asignadas y eventos administrativos recientes.
* **Vista Detalle de medico:** Debe mostrar el impacto de cualquier cambio sensible sobre agenda futura, citas confirmadas y solicitudes pendientes antes de confirmar la accion.
* **Vista Pacientes:** Debe listar pacientes registrados y tambien permitir identificar pacientes provenientes del flujo invitado cuando aun esten en proceso de vinculacion o revision operativa.
* **Vista Pacientes:** Debe mostrar nombre, RUT, correo, telefono, estado de cuenta, ultima cita, proxima cita, origen del registro y alertas relevantes para soporte.
* **Vista Pacientes:** Debe permitir revisar la historia operativa del paciente, sus solicitudes pendientes, sus citas confirmadas y su relacion con medicos y especialidades.
* **Vista Detalle de paciente:** Debe exponer la ficha administrativa completa con datos de `usuarios` y `pacientes`, historial de citas, solicitudes del flujo invitado, notificaciones y acciones de soporte autorizadas.
* **Vista Detalle de paciente:** Debe dejar explicito si el administrador solo supervisa informacion clinica o tambien puede modificarla; si puede hacerlo, cada cambio debe quedar auditado con antes y despues.
* **Vista Operacion:** Debe funcionar como centro operativo global y cubrir cuatro frentes: solicitudes pendientes, citas del sistema, horarios o disponibilidad y catalogos clinicos.
* **Vista Operacion:** Debe permitir filtrar por fecha, estado de cita, modalidad, medico, paciente, especialidad y tipo de origen de la solicitud.
* **Vista Solicitudes pendientes:** Debe resolver el hueco real del sistema para citas invitado con estado `pendiente`, permitiendo revisar, confirmar, reprogramar, reasignar o cancelar la solicitud desde una cola administrativa.
* **Vista Solicitudes pendientes:** Debe permitir asignar un slot real de `disponibilidad_medica` o reubicar al paciente en otro medico cuando la autoasignacion inicial no sea valida operativamente.
* **Vista Citas globales:** Debe permitir revisar todas las citas del sistema, su estado, su origen, si provienen de invitado o de paciente autenticado y cualquier conflicto de agenda asociado.
* **Vista Citas globales:** Debe permitir acciones administrativas controladas como confirmar, cancelar, reagendar o reasignar citas, con proteccion transaccional y trazabilidad.
* **Vista Gestion de horarios:** Debe permitir administrar disponibilidad de cualquier medico con los estados reales `disponible`, `reservada` y `bloqueada`, respetando la unicidad actual por medico, fecha y rango horario.
* **Vista Gestion de horarios:** Debe advertir cuando una accion impacta citas futuras o deja solicitudes sin capacidad de asignacion.
* **Vista Especialidades:** Debe permitir crear, editar, activar e inactivar especialidades usando la tabla `especialidades`; eliminar fisicamente no debe ser el camino normal porque existen referencias desde medicos y citas.
* **Vista Especialidades:** Debe mostrar cuantos medicos y cuantas citas dependen de cada especialidad antes de permitir una inactivacion o cambio sensible.
* **Vista Auditoria:** Debe exponer cambios sobre usuarios, medicos, pacientes, especialidades, disponibilidad, citas, restablecimientos de contrasena y ajustes administrativos sensibles.
* **Vista Auditoria:** Debe permitir filtrar por actor, entidad afectada, tipo de accion, fecha, resultado y contexto funcional.
* **Vista Auditoria:** Debe contemplar tanto acciones manuales del administrador como eventos automaticos relevantes del sistema cuando afecten trazabilidad o seguridad.
* **Vista Notificaciones:** Debe consumir notificaciones reales del administrador, marcar pendientes como leidas, limpiar la bandeja y abrir el modulo o entidad relacionada cuando existan metadatos suficientes.
* **Vista Notificaciones:** Debe cubrir alertas de solicitudes pendientes, conflictos de agenda, cambios de estado de medicos, errores de soporte, intentos de reseteo y eventos operativos que requieran intervencion.
* **Vista Ajustes:** Debe incluir perfil del administrador, cambio de contrasena, cierre de sesion, preferencias de notificacion y acceso a soporte tecnico o politicas del sistema.
* **Funcionalidad transversal:** Se debe crear un header admin reutilizable con nombre, rol, badge de notificaciones, acceso a ajustes y acciones rapidas segun el contexto.
* **Funcionalidad transversal:** Se debe crear un componente de navegacion admin coherente con el sistema de diseno existente y con mas densidad operativa que los modulos de paciente y medico.
* **Funcionalidad transversal:** Se debe crear un estado compartido de notificaciones del administrador para que el badge se mantenga sincronizado entre pantallas cacheadas.
* **Funcionalidad transversal:** Las tablas del backoffice deben soportar busqueda, filtros, paginacion o carga incremental y confirmaciones explicitas para acciones destructivas o sensibles.
* **Backend requerido:** Se debe crear un modulo `admin` en backend con controlador, rutas y montaje real en `server.js` bajo `/api/admin`.
* **Backend requerido:** El modulo admin debe exponer endpoints de dashboard, gestion de medicos, gestion de pacientes, operacion de citas y solicitudes, disponibilidad global, especialidades, notificaciones admin, ajustes y auditoria.
* **Backend requerido:** Todas las operaciones deben seguir usando autenticacion JWT y `requireRole('Administrador')`; aunque el admin tenga control amplio, no deben relajarse validaciones de negocio ni restricciones de integridad.
* **Backend requerido:** La gestion de medicos debe crear y actualizar en transaccion `usuarios` y `medicos`, evitando inconsistencias entre la cuenta y el perfil profesional.
* **Backend requerido:** La gestion de solicitudes pendientes debe resolver el estado `pendiente` del flujo invitado y convertirlo en asignacion real de horario o en cancelacion justificada.
* **Backend requerido:** La gestion de horarios debe reutilizar `disponibilidad_medica` y mantener transacciones cuando una accion toque disponibilidad y citas al mismo tiempo.
* **Backend requerido:** La gestion de especialidades debe reutilizar el estado logico `activa` o `inactiva` y bloquear operaciones que rompan referencias existentes.
* **Backend requerido:** El reseteo administrativo de contrasena no puede depender solo del `forgot-password` actual porque hoy esa ruta responde de forma generica y no genera un flujo recuperable por admin.
* **Backend requerido:** Si se habilita al admin para cambiar datos clinicos, esas rutas deben tener auditoria reforzada y una politica funcional explicita de alcance.
* **Base de datos requerida:** La estructura actual ya soporta usuarios, pacientes, medicos, especialidades, disponibilidad, citas, historial clinico basico y notificaciones.
* **Base de datos requerida:** Falta una estructura de auditoria, idealmente una tabla de eventos administrativos o una bitacora generica con actor, entidad, accion, payload resumido, fecha y resultado.
* **Base de datos requerida:** Falta una estructura segura para reseteo administrativo de contrasena, por ejemplo tokens de un solo uso, bandera de cambio obligatorio o mecanismo equivalente definido por seguridad.
* **Base de datos requerida:** Si las notificaciones admin deben abrir entidades concretas, la tabla `notificaciones` necesitara referencias navegables o metadatos adicionales porque hoy solo guarda texto y tipo.
* **Base de datos requerida:** Si el equipo decide permisos administrativos granulares, la base actual con un solo rol `Administrador` debera ampliarse para soportar niveles o permisos por accion.
* **Gap real critico:** No existe hoy ningun flujo administrativo para revisar y resolver solicitudes de invitado aunque la experiencia del paciente ya lo sugiere con el estado “En revision”.
* **Gap real critico:** No existe hoy auditoria persistida para cambios sensibles, por lo que cualquier modulo admin que modifique medicos, pacientes, horarios o contrasenas quedaria incompleto desde trazabilidad.
* **Gap real critico:** No existe hoy un reseteo de contrasena utilizable por backoffice; el flujo actual de recuperacion no cubre intervencion operativa del administrador.
* **Decision pendiente:** Definir si el administrador puede modificar informacion clinica sensible como diagnostico, tratamiento u observaciones, o si solo la supervisa y gestiona operativamente.
* **Decision pendiente:** Definir si “eliminar medico” y “eliminar paciente” significan baja logica, bloqueo de acceso o borrado fisico condicionado a ausencia total de historia operativa.
* **Decision pendiente:** Definir si el administrador puede impersonar usuarios o si el soporte se limitara a desbloqueo, activacion y reseteo de credenciales.
* **Decision pendiente:** Definir si el sistema requiere mas de un tipo de administrador o permisos granulares para separar operaciones, catalogos y auditoria.
* **Seguridad obligatoria:** Ninguna accion administrativa debe exponer contrasenas actuales, hashes o datos de recuperacion en respuestas, logs o toasts de interfaz.
* **Seguridad obligatoria:** Toda accion sensible del administrador debe requerir confirmacion explicita y quedar registrada en auditoria con actor, momento y entidad afectada.
* **Seguridad obligatoria:** Las operaciones sobre agenda, reasignacion de citas y reseteo de accesos deben ejecutarse con controles transaccionales y validacion estricta de entrada.
* **Seguridad obligatoria:** El backoffice no debe usar borrados fisicos por defecto sobre entidades con historia clinica u operativa; el camino normal debe ser estado logico y archivo controlado.
* **Seguridad obligatoria:** El frontend Angular debe tratar todas las respuestas como datos no confiables, evitar HTML inyectado, no guardar informacion sensible del backoffice en almacenamiento inseguro y no transportar autorizaciones por query params.
* **Orden recomendado de implementacion:** Primero crear el shell visual del admin y montar el modulo backend /api/admin con autenticacion y autorizacion real.
* **Orden recomendado de implementacion:** Segundo construir el dashboard de Inicio y la cola de solicitudes pendientes del flujo invitado, porque hoy ese es el mayor hueco operativo del sistema.
* **Orden recomendado de implementacion:** Tercero implementar gestion de medicos con alta, edicion, activacion o baja logica, gestion de horarios y reseteo de acceso.
* **Orden recomendado de implementacion:** Cuarto implementar gestion de pacientes y revision de su contexto operativo, dejando por politica clara el alcance sobre informacion clinica.
* **Orden recomendado de implementacion:** Quinto implementar Operacion global de citas, reasignaciones, cancelaciones y catalogo de especialidades.
* **Orden recomendado de implementacion:** Sexto implementar auditoria persistente y su vista de consulta antes de habilitar por completo las acciones mas sensibles del backoffice.
* **Orden recomendado de implementacion:** Septimo cerrar notificaciones admin, ajustes, seguridad de cuenta y validaciones finales de regresion.
* **Criterio de cierre funcional:** El modulo administrador estara realmente completo cuando pueda gestionar medicos, pacientes, solicitudes pendientes, citas, horarios, especialidades, restablecimiento de accesos y auditoria sobre datos reales, sin romper la integridad del sistema ni dejar acciones sensibles sin trazabilidad.
* **Regla documental:** Cada vista o flujo nuevo del backoffice que se implemente desde este roadmap debe quedar documentado en docs/admin con su archivo funcional propio.