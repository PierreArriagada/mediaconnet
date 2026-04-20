# PERFIL DEL PACIENTE

## Descripción general
- **Qué se realizó:** Creación completa de la vista de Perfil del paciente con diseño editorial asimétrico, datos reales de la base de datos y menú de configuración de cuenta.

---

## Archivos creados

### Frontend
- **Vista principal:** `app/src/app/features/paciente/perfil/perfil.page.html`
  - Diseño asimétrico de dos columnas (5/7 en escritorio, columna única en móvil)
  - Columna izquierda: avatar con iniciales generadas, nombre completo, correo, teléfono, chips de estado (paciente activo + ciudad)
  - Bento grid: tarjeta de próxima cita y tarjeta de alertas (notificaciones no leídas)
  - Columna derecha: menú de configuración con ítems: Mis datos, Seguridad, Preferencias, Soporte, Cerrar sesión
  - Skeleton de carga animado durante fetch de datos
  - Pull-to-refresh con ion-refresher
  - Integra `app-paciente-header` y `app-paciente-bottom-nav` con `activeTab="perfil"`

- **Componente:** `app/src/app/features/paciente/perfil/perfil.page.ts`
  - Inyecta `AuthService`, `PacienteService`, `Router`, `ToastController`
  - Carga datos del perfil vía `svc.getPerfil()` en `ngOnInit`
  - Método `cerrarSesion()`: llama `auth.logout()` y redirige a `/auth/login` con `replaceUrl`
  - Método `navegar(destino)`: navega a sub-rutas del perfil
  - Formateadores de fechas sin desfase de zona horaria
  - Getter `initiales`: genera dos letras desde nombre y apellido

- **Estilos:** `app/src/app/features/paciente/perfil/perfil.page.scss`
  - Tokens exclusivos `--mc-*` de `theme/variables.scss`
  - Clases BEM con prefijo `pf-` para evitar colisiones
  - Skeleton animado con shimmer (keyframes `pf-shimmer`)
  - Avatar con degradado primario y anillo decorativo
  - Ítems de menú con variante `--danger` para cerrar sesión

---

## Archivos modificados

### Backend
- **Controlador:** `backend/src/controllers/paciente.controller.js`
  - Agregada función `getPerfil`: JOIN de `usuarios` + `pacientes` filtrado por `id_usuario` del JWT (anti-IDOR)
  - Retorna datos de identidad, próxima cita y conteo de alertas (notificaciones no leídas)
  - Exportada en `module.exports`

- **Rutas backend:** `backend/src/routes/paciente.routes.js`
  - Agregada ruta `GET /perfil` conectada a `getPerfil`
  - Heredan el middleware `requireAuth` + `requireRole('Paciente')` definido a nivel de router

### Frontend — Servicio y enrutador
- **Servicio:** `app/src/app/core/services/paciente.service.ts`
  - Agregadas interfaces exportadas: `PerfilProximaCita`, `PerfilData`
  - Agregado método `getPerfil(): Observable<PerfilData>` → `GET /api/paciente/perfil`

- **Rutas del módulo paciente:** `app/src/app/features/paciente/paciente.routes.ts`
  - Agregada ruta `perfil` con lazy load de `PerfilPage`
  - Ruta resultante: `/paciente/perfil`

- **Componente de navegación inferior:** `app/src/app/shared/components/paciente-bottom-nav/paciente-bottom-nav.component`
  - No modificado; ya soportaba `activeTab="perfil"` e `ir('perfil')` previamente

---

## Flujo de datos
- El paciente autenticado accede a `/paciente/perfil`
- El guard `authGuard` + `requireRole('Paciente')` protegen el acceso
- El componente llama `GET /api/paciente/perfil` con el JWT del header
- El backend extrae `id_usuario` del token, realiza tres queries (perfil, próxima cita, alertas) y responde
- El frontend renderiza los datos en el layout o muestra un skeleton durante la carga

---

## Navegación desde menú
- **Mis datos** → `/paciente/perfil/mis-datos` (ruta preparada para implementación futura)
- **Seguridad** → `/paciente/perfil/seguridad` (ruta preparada para implementación futura)
- **Preferencias** → `/paciente/perfil/preferencias` (ruta preparada para implementación futura)
- **Soporte** → `/paciente/perfil/soporte` (ruta preparada para implementación futura)
- **Cerrar sesión** → limpia `localStorage` y redirige a `/auth/login`
