// Compatibilidad legacy:
// Algunas rutas/imports antiguos apuntan a `notificaciones.page.ts`.
// La implementación real y mantenida de notificaciones admin vive en
// `admin-notificaciones.page.ts`.
export { AdminNotificacionesPage as NotificacionesPage } from './admin-notificaciones.page';