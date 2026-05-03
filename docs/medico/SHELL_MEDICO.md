* **Que se realizo:** Consolidacion del shell visual del modulo Medico con `app-medico-header`, `app-medico-bottom-nav` y `NotificacionesMedicoStateService` como piezas reutilizables del rol profesional.
* **Que se realizo:** El shell ya se usa en Inicio, Agenda, Pacientes, Ficha de paciente, Perfil y Notificaciones; la bandeja de notificaciones volvio a usar el header compartido del medico.
* **Archivos creados:**
  * `app/src/app/shared/components/medico-header/medico-header.component.ts` - componente de cabecera del modulo medico
  * `app/src/app/shared/components/medico-header/medico-header.component.html` - plantilla con avatar, nombre y badge de notificaciones
  * `app/src/app/shared/components/medico-header/medico-header.component.scss` - estilos del header clinico
  * `app/src/app/shared/components/medico-bottom-nav/medico-bottom-nav.component.ts` - componente de barra inferior con tipo `MedicoNavTab`
  * `app/src/app/shared/components/medico-bottom-nav/medico-bottom-nav.component.html` - plantilla con Inicio, Agenda, Pacientes y Perfil
  * `app/src/app/shared/components/medico-bottom-nav/medico-bottom-nav.component.scss` - estilos de navegacion inferior del rol medico
  * `app/src/app/core/services/notificaciones-medico-state.service.ts` - estado compartido del badge de notificaciones
* **Archivos modificados:**
  * `app/src/app/features/medico/medico.routes.ts` - arbol de rutas del modulo medico con home, agenda, citas, pacientes, ficha, perfil y notificaciones
  * `app/src/app/features/medico/home/medico-home.page.ts` y `app/src/app/features/medico/home/medico-home.page.html` - shell aplicado a la portada operativa del medico
  * `app/src/app/features/medico/agenda/agenda.page.ts` y `app/src/app/features/medico/agenda/agenda.page.html` - shell aplicado a la agenda y a la gestion de disponibilidad
  * `app/src/app/features/medico/pacientes/pacientes.page.ts` y `app/src/app/features/medico/pacientes/pacientes.page.html` - shell aplicado al listado de pacientes
  * `app/src/app/features/medico/fichapacientes/fichapacientes.page.ts` y `app/src/app/features/medico/fichapacientes/fichapacientes.page.html` - shell aplicado a la ficha individual del paciente
  * `app/src/app/features/medico/perfil/perfil.page.ts` y `app/src/app/features/medico/perfil/perfil.page.html` - shell aplicado al perfil profesional
  * `app/src/app/features/medico/notificaciones/notificaciones.page.ts` y `app/src/app/features/medico/notificaciones/notificaciones.page.html` - shell compartido y sincronizacion del badge en la bandeja
* **Rutas habilitadas:** `/medico/home`, `/medico/agenda`, `/medico/citas`, `/medico/pacientes`, `/medico/pacientes/:id/ficha`, `/medico/perfil`, `/medico/notificaciones`
* **Cobertura actual del shell:** Inicio, Agenda, Pacientes, Ficha de paciente, Perfil y Notificaciones ya comparten identidad visual; `Citas` sigue siendo una vista placeholder y aun no representa un detalle clinico real.
* **Diseno:** avatar con `--mc-gradient-primary`; barra inferior con estado activo en `--mc-primary-fixed`; notificaciones vive en el header y no como pestana principal.
* **Dependencias:** `MedicoHeaderComponent`, `MedicoBottomNavComponent`, `NotificacionesMedicoStateService`, `AuthService`, `Router`, `IonContent`
