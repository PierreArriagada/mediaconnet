# MediConnect — Aplicación móvil híbrida

Frontend Ionic/Angular standalone con PostgreSQL local y entorno de desarrollo completamente dockerizado.

## Estado actual

- Frontend validado sobre Angular 21.2, Ionic 8.8, Capacitor 8.3 y TypeScript 5.9.
- Build, lint y tests verificados dentro de Docker.
- Base de datos PostgreSQL 18 inicializada automáticamente desde [database/01_init.sql](database/01_init.sql).
- Login operativo en modo mock con usuarios alineados al seed de la base de datos.
- Backend REST todavía no incluido en este repositorio.

## Guía principal de arranque

La documentación completa para dejar el proyecto listo en otra máquina está en [docs/INICIO.md](docs/INICIO.md).

Ese documento incluye:

- construcción y arranque de Docker
- instalación de dependencias dentro del contenedor
- inicio del servidor Ionic
- verificación de build, lint y base de datos
- reinicio completo de la base de datos
- credenciales del login actual
- comandos de mantenimiento y solución de problemas

## Inicio rápido

Desde la raíz del proyecto:

```bash
docker compose up -d --build
docker exec mediconnect-app sh -c "cd /workspace && npm install"
docker exec -d mediconnect-app sh -c "cd /workspace && ionic serve --host=0.0.0.0 --port=8100 --no-open --no-interactive > /tmp/serve.log 2>&1"
docker exec mediconnect-app sh -c "cat /tmp/serve.log"
```

Cuando veas `Compiled successfully`, abre:

```text
http://localhost:8100
```

## Credenciales actuales de acceso

| Correo | Contraseña | Rol |
|---|---|---|
| `paciente1@mediconnect.cl` | `mediconnect2026` | Paciente |
| `medico1@mediconnect.cl` | `mediconnect2026` | Médico |
| `admin@mediconnect.cl` | `mediconnect2026` | Administrador |

## Infraestructura actual

- [Dockerfile](Dockerfile): imagen base Node 24 Alpine con Angular CLI 21.2.7, Ionic CLI, Capacitor CLI 8.3.1 y Chromium para tests headless.
- [docker-compose.yml](docker-compose.yml): orquesta `mediconnect-app` y `mediconnect-postgres` con PostgreSQL 18.
- [app/package.json](app/package.json): stack actual de Angular, Ionic, Capacitor y lint.
- [database/01_init.sql](database/01_init.sql): esquema PostgreSQL, índices, triggers y datos semilla.
- [app/src/tests](app/src/tests): pruebas unitarias base del frontend.

## Verificación rápida

```bash
docker exec mediconnect-app sh -c "cd /workspace && npm run build"
docker exec mediconnect-app sh -c "cd /workspace && npm run lint"
docker exec mediconnect-app sh -c "cd /workspace && npm run test:ci"
```

## Documentación disponible

- [docs/INICIO.md](docs/INICIO.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/API_CONTRACT.md](docs/API_CONTRACT.md)
- [docs/BACKEND_PLAN.md](docs/BACKEND_PLAN.md)
- [docs/DEV_MODE.md](docs/DEV_MODE.md)

## Notas importantes

1. Todo el flujo de desarrollo corre dentro de Docker.
2. `docker compose up` no inicia `ionic serve` automáticamente; ese paso se ejecuta aparte.
3. PostgreSQL ejecuta los scripts de [database](database) solo cuando el volumen está vacío.
4. Si cambias [database/01_init.sql](database/01_init.sql) o quieres reinicializar la BD en PostgreSQL 18, usa `docker compose down -v` antes de volver a levantar.
5. El login actual no autentica contra PostgreSQL directamente; usa credenciales mock alineadas con el seed mientras no exista backend.
6. El frontend conserva `http://localhost:3000/api` como URL reservada para el backend futuro, aunque hoy el flujo de login se resuelve localmente en el frontend.
