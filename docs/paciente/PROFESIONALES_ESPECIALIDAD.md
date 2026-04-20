# Vista: Profesionales por Especialidad (Paciente)

---

## Qué se realizó

- Creación de la vista de listado de médicos para una especialidad seleccionada en el flujo de reserva de horas.
- Los médicos se cargan desde la base de datos según la especialidad recibida por parámetro de ruta.
- Muestra avatar con iniciales y tema de color según id del médico, nombre completo con título honorífico (Dr./Dra.), especialidad y años de experiencia.
- Muestra los próximos 3 turnos disponibles por médico obtenidos de `disponibilidad_medica` con estado `disponible` y fecha futura.
- Los slots del día actual se resaltan visualmente con el chip de color primario fijo.
- Chips de filtro en cliente: Todos / Disponible hoy / Esta semana — sin peticiones adicionales al servidor.
- Estado vacío con mensaje diferenciado según si no hay médicos en la especialidad o si el filtro no tiene resultados.
- Botón volver que usa `Location.back()` para regresar a la vista de especialidades.
- Skeleton de carga en tarjetas y encabezado editorial.
- Toast de error y toast informativo de funcionalidad próxima ("Ver disponibilidad").

---

## Archivos creados

- `app/src/app/features/paciente/profesionales/profesionales.page.ts` — Componente standalone; carga médicos + disponibilidades vía `PacienteService.getProfesionales(idEspecialidad)`, gestiona filtros en cliente.
- `app/src/app/features/paciente/profesionales/profesionales.page.html` — Plantilla: header, botón volver, encabezado editorial con nombre de especialidad, chips de filtro, grid de tarjetas de médicos, estado vacío, bottom nav activo en "reservar".
- `app/src/app/features/paciente/profesionales/profesionales.page.scss` — Estilos con tokens `--mc-*`; avatar con temas `.mc-avatar--{primary|tertiary|secondary}`; chips de filtro; slots con `.mc-slot--today`; estado vacío centrado.

---

## Archivos modificados

- `app/src/app/features/paciente/paciente.routes.ts` — Agregada ruta `profesionales/:idEspecialidad` con lazy-load de `ProfesionalesPage`.
- `app/src/app/core/services/paciente.service.ts` — Agregadas interfaces `DisponibilidadSlot`, `MedicoProfesional`, `ProfesionalesData`; método `getProfesionales(idEspecialidad)`.
- `backend/src/controllers/paciente.controller.js` — Nueva función `getProfesionalesPorEspecialidad`: valida parámetros, verifica especialidad activa, obtiene médicos activos, consulta disponibilidades futuras (máx 3 por médico vía `ROW_NUMBER` window function), retorna noLeidas.
- `backend/src/routes/paciente.routes.js` — Registrada ruta `GET /api/paciente/profesionales/:idEspecialidad` protegida por `requireAuth` y `requireRole('Paciente')`.

---

## Dependencias reutilizadas

- Componente `app-paciente-header` (shared) — recibe `userName` y `noLeidas`.
- Componente `app-paciente-bottom-nav` (shared) — recibe `activeTab="reservar"`.
- Servicio `AuthService` — datos del usuario autenticado.
- Servicio `PacienteService` — método `getProfesionales()`.
- Tokens de diseño en `theme/variables.scss` — no se modificaron.

---

## Flujo de datos

- `ProfesionalesPage.ngOnInit()` lee `:idEspecialidad` de `ActivatedRoute` → `PacienteService.getProfesionales()` → `GET /api/paciente/profesionales/:id` → PostgreSQL: especialidad activa + médicos activos + próximas 3 disponibilidades por médico (window function) + noLeidas.
- Filtros Hoy/Semana operan en cliente sobre los datos ya cargados.
- Botón "Ver disponibilidad" reservado para la próxima vista de confirmación de cita.

---

## Seguridad

- Endpoint protegido por `requireAuth` + `requireRole('Paciente')`.
- Parámetro `:idEspecialidad` validado con `parseInt` + `isNaN` + `idEspecialidad >= 1` en backend y en frontend (redirige a `/paciente/reservar` si es inválido).
- `id_usuario` extraído exclusivamente del JWT — prevención de IDOR.
- Window function `ROW_NUMBER` en SQL evita N+1 queries al obtener disponibilidades de múltiples médicos en una sola consulta.
