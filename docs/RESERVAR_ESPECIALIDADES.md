# Vista: Reservar Especialidad (Paciente)

---

## Qué se realizó

- Creación de la vista de selección de especialidades para el flujo de reserva de horas médicas del paciente autenticado.
- La vista lista las especialidades activas obtenidas desde la base de datos en tiempo real.
- Incluye barra de búsqueda con filtrado en cliente por nombre y descripción.
- Cada tarjeta de especialidad muestra ícono dinámico y tema de color según la especialidad.
- Banner informativo de soporte al pie de la lista.
- Skeleton de carga mientras se obtienen los datos del servidor.
- Toast de error ante fallo de red o servidor.

---

## Archivos creados

- `app/src/app/features/paciente/reservar/reservar.page.ts` — Componente standalone; carga especialidades vía `PacienteService.getEspecialidades()`, gestiona búsqueda local y navegación.
- `app/src/app/features/paciente/reservar/reservar.page.html` — Plantilla: header reutilizable, barra de búsqueda, bento grid de tarjetas con `@for` y `@if`, banner de ayuda, bottom nav activo en "reservar".
- `app/src/app/features/paciente/reservar/reservar.page.scss` — Estilos con tokens `--mc-*`; clases `.mc-esp-card__icon--{tema}` para los cinco temas de color; skeleton animation; banner degradado.

---

## Archivos modificados

- `app/src/app/features/paciente/paciente.routes.ts` — Agregada ruta `reservar` con lazy-load de `ReservarPage`.
- `app/src/app/core/services/paciente.service.ts` — Agregadas interfaces `Especialidad` y `EspecialidadesData`; nuevo método `getEspecialidades()` que consume `GET /api/paciente/especialidades`.
- `backend/src/controllers/paciente.controller.js` — Nueva función `getEspecialidadesConBadge` que retorna especialidades activas y conteo de notificaciones no leídas del paciente en un solo viaje al servidor.
- `backend/src/routes/paciente.routes.js` — Registrada ruta `GET /api/paciente/especialidades` protegida por `requireAuth` y `requireRole('Paciente')`.

---

## Dependencias reutilizadas

- Componente `app-paciente-header` (shared) — recibe `userName` y `noLeidas`.
- Componente `app-paciente-bottom-nav` (shared) — recibe `activeTab="reservar"`.
- Servicio `AuthService` — provee datos del usuario autenticado para el header.
- Tokens de diseño en `theme/variables.scss` — no se modificaron.

---

## Flujo de datos

- `ReservarPage.ngOnInit()` → `PacienteService.getEspecialidades()` → `GET /api/paciente/especialidades` → consulta paralela en PostgreSQL: especialidades activas + notificaciones no leídas del usuario.
- El filtrado de especialidades es 100% en cliente (sin peticiones adicionales al servidor).
- La navegación a profesionales se hace vía `router.navigate(['/paciente', 'profesionales', id_especialidad])` (vista futura).

---

## Seguridad

- El endpoint `/api/paciente/especialidades` requiere JWT válido y rol `Paciente` (middleware `requireAuth` + `requireRole`).
- El `id_usuario` se extrae exclusivamente del token JWT; nunca se acepta del cliente para prevenir IDOR.
- La búsqueda filtra solo en cliente sobre datos ya validados por el servidor.
