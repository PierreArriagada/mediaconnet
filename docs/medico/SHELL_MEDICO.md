* **Qué se realizó:** Creación de los componentes de navegación del módulo Médico — header y barra inferior — como componentes Angular standalone reutilizables, y refactorización de medico-home para usarlos.
* **Archivos creados:**
  * `app/src/app/shared/components/medico-header/medico-header.component.ts` — componente de cabecera del módulo médico
  * `app/src/app/shared/components/medico-header/medico-header.component.html` — plantilla con avatar, etiqueta "Panel Médico", nombre, badge de notificaciones
  * `app/src/app/shared/components/medico-header/medico-header.component.scss` — estilos con gradiente primario en el avatar
  * `app/src/app/shared/components/medico-bottom-nav/medico-bottom-nav.component.ts` — componente de barra inferior con tipo MedicoNavTab
  * `app/src/app/shared/components/medico-bottom-nav/medico-bottom-nav.component.html` — plantilla con pestañas Inicio, Agenda, Pacientes, Perfil
  * `app/src/app/shared/components/medico-bottom-nav/medico-bottom-nav.component.scss` — estilos con --mc-primary-fixed como estado activo
  * `app/src/app/core/services/notificaciones-medico-state.service.ts` — estado compartido de notificaciones del médico (signal)
* **Archivos modificados:**
  * `app/src/app/features/medico/home/medico-home.page.ts` — agregadas importaciones de MedicoHeaderComponent y MedicoBottomNavComponent en el array imports del decorador
  * `app/src/app/features/medico/home/medico-home.page.html` — reemplazado el header inline por `<app-medico-header>`; agregado `<app-medico-bottom-nav>` al final de ion-content
* **Rutas del navbar:** Inicio → /medico/home, Agenda → /medico/agenda, Pacientes → /medico/pacientes, Perfil → /medico/perfil
* **Diseño:** avatar con --mc-gradient-primary; barra inferior usa --mc-primary-fixed como estado activo; estructura visual coherente con el módulo paciente
* **Dependencias:** MedicoHeaderComponent, MedicoBottomNavComponent, NotificacionesMedicoStateService, AuthService, Router
