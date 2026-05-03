* **Que se realizo:** Consolidacion del shell base del modulo Administrador con header, navbar inferior, guard de rol y redireccion por rol desde login.
* **Que se realizo:** El modulo admin ya no depende del dashboard legacy. Hoy existen las rutas `/admin/home`, `/admin/operacion`, `/admin/operacion/horarios` y `/admin/operacion/especialidades`.
* **Que se realizo:** Se agrego `AdminService` y un backend real bajo `/api/admin` para listar medicos activos y administrar disponibilidad por medico desde la vista de horarios.
* **Archivos creados:**
  * `app/src/app/shared/components/admin-header/admin-header.component.ts` - componente de cabecera del administrador
  * `app/src/app/shared/components/admin-header/admin-header.component.html` - plantilla del header con avatar, rol, nombre, notificaciones y ajustes
  * `app/src/app/shared/components/admin-header/admin-header.component.scss` - estilos del header administrativo
  * `app/src/app/shared/components/admin-bottom-nav/admin-bottom-nav.component.ts` - componente de barra inferior con cinco pestanas visuales
  * `app/src/app/shared/components/admin-bottom-nav/admin-bottom-nav.component.html` - plantilla con Inicio, Medicos, Pacientes, Operacion y Auditoria
  * `app/src/app/shared/components/admin-bottom-nav/admin-bottom-nav.component.scss` - estilos de navegacion inferior del admin
  * `app/src/app/core/services/notificaciones-admin-state.service.ts` - estado compartido del badge de notificaciones del administrador
  * `app/src/app/core/services/admin.service.ts` - servicio HTTP del modulo admin para medicos y disponibilidad
  * `app/src/app/core/guards/role.guard.ts` - guard funcional para proteger rutas por rol
  * `app/src/app/features/admin/admin.routes.ts` - arbol de rutas del modulo admin
  * `app/src/app/features/admin/home/admin-home.page.ts` y `app/src/app/features/admin/home/admin-home.page.html` - portada del backoffice
  * `app/src/app/features/admin/operacion/operacion.routes.ts` y `app/src/app/features/admin/operacion/operacion-hub.page.html` - hub del centro operativo
  * `app/src/app/features/admin/operacion/horarios/horarios.page.ts` - gestion global de disponibilidad por medico
  * `app/src/app/features/admin/operacion/especialidades/especialidades.page.ts` - vista inicial de especialidades aun en stub local
  * `backend/src/routes/admin.routes.js` - rutas Express del modulo admin
  * `backend/src/controllers/admin.controller.js` - controlador con medicos activos y CRUD de disponibilidad por medico
* **Archivos eliminados:**
  * `app/src/app/features/dashboard/` - carpeta legacy eliminada; la ruta `/dashboard` ya no existe en el arbol actual
* **Archivos modificados:**
  * `app/src/app/app.routes.ts` - ruta `/admin` protegida con `authGuard` + `roleGuard('Administrador')`
  * `app/src/app/features/auth/login/login.page.ts` - redireccion por rol al modulo correcto
  * `backend/src/server.js` - montaje de `/api/admin`
  * `app/src/app/features/admin/home/admin-home.page.scss` - fondo y layout del Inicio admin
* **Rutas habilitadas:** `/admin/home`, `/admin/operacion`, `/admin/operacion/horarios`, `/admin/operacion/especialidades`
* **Cobertura actual del shell:** Inicio reemplaza el dashboard generico; Operacion enlaza a Horarios y Especialidades; la barra inferior conserva Medicos, Pacientes y Auditoria como objetivos visuales aun no montados como vistas reales. `Especialidades` sigue con datos stub; `Horarios` ya consume backend real.
* **Diseno:** avatar con gradiente secondary->primary para distinguir del modulo medico; barra inferior con estado activo en `--mc-secondary-container`; notificaciones y ajustes viven en el header y no en la barra inferior.
* **Dependencias:** `AdminHeaderComponent`, `AdminBottomNavComponent`, `AdminService`, `NotificacionesAdminStateService`, `roleGuard`, `AuthService`, `IonContent`
