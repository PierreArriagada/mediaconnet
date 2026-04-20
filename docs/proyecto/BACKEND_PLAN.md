# Backend — Estado actual y roadmap

Este documento ya no describe un backend hipotético. Resume lo que existe hoy en `backend/` y lo que todavía falta construir.

## Estado actual implementado

La API REST está levantada en `http://localhost:3000/api` dentro del contenedor `mediconnect-api`.

Stack actual:

| Aspecto | Estado actual |
|---|---|
| Runtime | Node.js 24 LTS |
| Framework | Express 4.21 |
| Base de datos | PostgreSQL 18 |
| Autenticación | JWT |
| Hash de contraseñas | `pgcrypto` con `crypt(..., gen_salt('bf', 12))` |
| Puerto | `3000` |
| Hot reload | `node --watch` |

## Estructura actual del backend

```text
backend/
├── Dockerfile
├── package.json
└── src/
    ├── config/
    │   └── jwt.config.js
    ├── controllers/
    │   ├── auth.controller.js
    │   ├── citas.controller.js
    │   ├── medico.controller.js
    │   └── paciente.controller.js
    ├── db/
    │   └── pool.js
    ├── middleware/
    │   ├── auth.middleware.js
    │   └── error.middleware.js
    ├── routes/
    │   ├── auth.routes.js
    │   ├── citas.routes.js
    │   ├── medico.routes.js
    │   └── paciente.routes.js
    └── server.js
```

## Endpoints disponibles hoy

| Método | Ruta | Protección | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/login` | Público | Valida credenciales contra PostgreSQL y devuelve JWT + usuario |
| `POST` | `/api/auth/register` | Público | Crea cuenta en `usuarios` con rol `Paciente` |
| `POST` | `/api/auth/forgot-password` | Público | Responde siempre `200` con mensaje genérico |
| `GET` | `/api/paciente/dashboard` | JWT + rol `Paciente` | Devuelve próxima cita y últimas 5 notificaciones del paciente autenticado |
| `GET` | `/api/medico/dashboard` | JWT + rol `Medico` | Devuelve citas de hoy, pendientes de marcar y próxima cita del médico |
| `GET` | `/api/medico/citas-hoy` | JWT + rol `Medico` | Citas pasadas o de hoy del médico con estado de asistencia |
| `GET` | `/api/medico/citas-proximas` | JWT + rol `Medico` | Citas futuras confirmadas del médico |
| `PATCH` | `/api/medico/cita/:idCita/marcar-asistencia` | JWT + rol `Medico` | Marca si el paciente asistió o no y completa la cita |

## Seguridad actual

El backend ya aplica estas capas:

- `helmet`
- `cors` restringido a orígenes locales del frontend
- `express-rate-limit` global y por autenticación
- `express-validator` para payloads
- límite de cuerpo JSON de `10kb`
- consultas parametrizadas con `pg`
- JWT con secreto obligatorio
- middleware de autenticación y autorización por rol

## Integración con Docker

`docker-compose.yml` ya levanta el servicio `mediconnect-api` con estas condiciones:

- build desde `./backend`
- `DATABASE_URL` apuntando a `mediconnect-postgres`
- `JWT_SECRET` definido por entorno
- puerto expuesto `3000:3000`
- dependencia a PostgreSQL con `healthcheck`

## Limitaciones actuales

1. El registro crea la cuenta en `usuarios`, pero todavía no crea el perfil de `pacientes`.
2. `forgot-password` no envía correo todavía; solo mantiene el comportamiento seguro de no revelar si el correo existe.
3. No hay refresh tokens ni lista de revocación.
4. Los módulos de médico y administrador aún no tienen endpoints propios.

## Roadmap sugerido

### Fase 2 — Perfil de paciente

- extender la vista de registro con campos requeridos por `pacientes`
- crear el `INSERT` transaccional en `usuarios` + `pacientes`
- devolver al frontend el identificador funcional del paciente

### Fase 3 — Catálogos clínicos

- `GET /api/especialidades`
- `GET /api/medicos?especialidad=:id`
- `GET /api/disponibilidad/:medicoId?fecha=YYYY-MM-DD`

### Fase 4 — Citas médicas

- `POST /api/citas`
- `GET /api/citas/paciente/:id`
- `PATCH /api/citas/:id`

### Fase 5 — Notificaciones y backoffice

- `PATCH /api/notificaciones/:id/leer`
- endpoints administrativos protegidos por `requireRole('Administrador')`

## Mapeo canónico de roles

Los roles deben tratarse exactamente como existen en la base de datos:

- `id_rol = 1` → `Administrador`
- `id_rol = 2` → `Paciente`
- `id_rol = 3` → `Medico`
