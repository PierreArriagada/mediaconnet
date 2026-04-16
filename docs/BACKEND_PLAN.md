# Plan del Backend — MediConnect

Este documento define los requisitos que debe cumplir el backend para integrarse con el frontend actual ya actualizado a Angular 21.

---

## Requisitos generales

| Aspecto | Decisión sugerida |
|---|---|
| Runtime | Node.js 24 LTS |
| Framework | Express, Fastify, NestJS u otro compatible con Node 24 |
| Base de datos | PostgreSQL 18 |
| Autenticación | JWT |
| Puerto | `3000` |
| Base URL esperada por frontend | `http://localhost:3000/api` |

---

## Endpoints mínimos de fase 1

### Autenticación

```text
POST /api/auth/login
  Body:    { "email": string, "password": string }
  200 OK:  { "token": string, "user": { "id": string, "email": string, "name": string, "role": string } }
  401:     { "message": string }
```

Ver contrato completo en `docs/API_CONTRACT.md`.

### Registro

```text
POST /api/auth/register
  Body:    { "name": string, "email": string, "password": string, "rut": string, ... }
  201:     { "token": string, "user": { ... } }
  409:     { "message": "El correo ya está registrado" }
```

---

## Endpoints de fase 2

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/especialidades` | Listar especialidades activas |
| `GET` | `/api/medicos?especialidad=:id` | Médicos filtrados por especialidad |
| `GET` | `/api/disponibilidad/:medicoId?fecha=YYYY-MM-DD` | Bloques disponibles |
| `POST` | `/api/citas` | Crear cita médica |
| `GET` | `/api/citas/paciente/:id` | Historial de citas del paciente |
| `PATCH` | `/api/citas/:id` | Cancelar o reprogramar |

---

## Endpoints de fase 3

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/notificaciones` | Notificaciones del usuario autenticado |
| `PATCH` | `/api/notificaciones/:id/leer` | Marcar como leída |

---

## Conexión a base de datos

El servicio PostgreSQL ya existe en `docker-compose.yml`:

```text
Host:     mediconnect-db
Puerto:   5432
Usuario:  postgres
Password: postgres
Base:     mediconnect
```

Desde fuera de Docker: `localhost:5432`.

---

## Integración con Docker

Para agregar el backend al proyecto:

1. Crear carpeta `api/` o `backend/` en la raíz.
2. Agregar un `Dockerfile` para el servicio backend.
3. Agregar un servicio `mediconnect-api` en `docker-compose.yml`.

Ejemplo:

```yaml
mediconnect-api:
  build: ./api
  container_name: mediconnect-api
  ports:
    - "3000:3000"
  environment:
    DATABASE_URL: postgresql://postgres:postgres@mediconnect-db:5432/mediconnect
    JWT_SECRET: cambiar-en-produccion
  depends_on:
    mediconnect-db:
      condition: service_healthy
```

El frontend ya apunta a `http://localhost:3000/api`, así que no requiere cambios estructurales al conectar el backend.

---

## Seguridad mínima

- Hash de contraseñas con bcrypt.
- JWT firmado con `JWT_SECRET` desde variables de entorno.
- CORS habilitado para `http://localhost:8100` y `http://localhost:4200` en desarrollo.
- Rate limiting en `/api/auth/login`.
- Validación y sanitización de payloads en todos los endpoints.

---

## Mapeo BD ↔ API

La tabla `usuarios` usa `contrasena_hash`. El backend debe:

1. Recibir `password` en texto plano.
2. Comparar con `bcrypt.compare(password, usuario.contrasena_hash)`.
3. Generar JWT con `{ id, email, role }`.
4. Devolver el JWT más los datos del usuario sin hash.

El campo `role` se obtiene desde la tabla `roles`:

- `id_rol = 1` → `admin`
- `id_rol = 2` → `patient`
- `id_rol = 3` → `doctor`
