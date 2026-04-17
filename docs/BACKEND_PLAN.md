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
    │   └── auth.controller.js
    ├── db/
    │   └── pool.js
    ├── middleware/
    │   ├── auth.middleware.js
    │   └── error.middleware.js
    ├── routes/
    │   └── auth.routes.js
    └── server.js
```

## Endpoints disponibles hoy

| Método | Ruta | Estado | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/login` | Activo | Valida credenciales contra PostgreSQL y devuelve JWT + usuario |
| `POST` | `/api/auth/register` | Activo | Crea cuenta en `usuarios` con rol `Paciente` |
| `POST` | `/api/auth/forgot-password` | Activo | Responde siempre `200` con mensaje genérico |

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

1. El backend solo cubre autenticación; el resto del dominio médico aún no está expuesto por API.
2. El registro crea la cuenta en `usuarios`, pero todavía no crea el perfil de `pacientes`.
3. `forgot-password` no envía correo todavía; solo mantiene el comportamiento seguro de no revelar si el correo existe.
4. No hay refresh tokens ni lista de revocación.
5. No existe separación por módulos de negocio más allá de autenticación.

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

- `GET /api/notificaciones`
- `PATCH /api/notificaciones/:id/leer`
- endpoints administrativos protegidos por `requireRole('Administrador')`

## Mapeo canónico de roles

Los roles deben tratarse exactamente como existen en la base de datos:

- `id_rol = 1` → `Administrador`
- `id_rol = 2` → `Paciente`
- `id_rol = 3` → `Medico`
