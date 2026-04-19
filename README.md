# MediConnect — Plataforma médica híbrida

Monorepo full-stack con frontend Ionic/Angular, backend Express y PostgreSQL, todo dockerizado para desarrollo local.

## Estado actual

- Frontend validado sobre Angular 21.2, Ionic 8.8, Capacitor 8.3 y TypeScript 5.9.
- Backend REST incluido en [backend](backend) con Node 24 + Express.
- Autenticación real contra PostgreSQL 18 mediante `pgcrypto`, JWT y consultas parametrizadas.
- Registro operativo: crea cuentas en `usuarios` con rol `Paciente` (`id_rol = 2`).
- Recuperación de contraseña operativa a nivel de endpoint: responde de forma genérica y segura, pero todavía no envía correos.
- Entorno local compuesto por tres contenedores: `mediconnect-app`, `mediconnect-api` y `mediconnect-postgres`.

## Guía principal de arranque

La documentación completa para levantar el proyecto en otra máquina está en [docs/INICIO.md](docs/INICIO.md).

Ese documento incluye:

- construcción y arranque de Docker
- instalación de dependencias del frontend dentro del contenedor
- verificación del backend y la base de datos
- inicio del servidor Ionic
- validaciones de login, registro y consultas SQL
- mantenimiento, reinicio completo y solución de problemas

## Inicio rápido

Desde la raíz del proyecto:

```bash
docker compose up -d --build
docker exec mediconnect-app sh -c "cd /workspace && npm install"
docker compose logs mediconnect-api --tail=30
docker exec -d mediconnect-app sh -c "cd /workspace && ionic serve --host=0.0.0.0 --port=8100 --poll=1000 --no-open --no-interactive > /tmp/serve.log 2>&1"
docker exec mediconnect-app sh -c "cat /tmp/serve.log"
```

Cuando veas `Compiled successfully`, abre:

```text
http://localhost:8100
```

## Infraestructura actual

- [Dockerfile](Dockerfile): imagen del frontend con Node 24 Alpine, Angular CLI 21.2.7, Ionic CLI, Capacitor CLI 8.3.1 y Chromium para tests headless.
- [docker-compose.yml](docker-compose.yml): orquesta `mediconnect-app`, `mediconnect-api` y `mediconnect-postgres`.
- [backend/package.json](backend/package.json): dependencias del backend (`express`, `pg`, `helmet`, `jsonwebtoken`, `express-validator`, `express-rate-limit`).
- [backend/src](backend/src): API REST modular con `config`, `controllers`, `db`, `middleware` y `routes`.
- [app/package.json](app/package.json): stack actual del frontend.
- [database/01_init.sql](database/01_init.sql): esquema PostgreSQL, extensión `pgcrypto`, índices, triggers y datos semilla.
- [app/src/tests](app/src/tests): pruebas unitarias del frontend.

## Verificación rápida

```bash
docker exec mediconnect-app sh -c "cd /workspace && npm run build"
docker exec mediconnect-app sh -c "cd /workspace && npm run lint"
docker exec mediconnect-app sh -c "cd /workspace && npm run test:ci"
docker exec mediconnect-postgres psql -U postgres -d mediconnect -c "SELECT id_usuario, correo, id_rol, estado FROM usuarios ORDER BY id_usuario;"
```

## Documentación disponible

- [docs/INICIO.md](docs/INICIO.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/API_CONTRACT.md](docs/API_CONTRACT.md)
- [docs/BACKEND_PLAN.md](docs/BACKEND_PLAN.md)
- [docs/DEV_MODE.md](docs/DEV_MODE.md)
- [docs/SECURITY_PASSWORD.md](docs/SECURITY_PASSWORD.md)

## Notas importantes

1. Todo el flujo de desarrollo corre dentro de Docker.
2. `docker compose up -d --build` inicia backend y base de datos automáticamente, pero no ejecuta `ionic serve`; ese paso sigue siendo manual.
3. PostgreSQL ejecuta los scripts de [database](database) solo cuando el volumen está vacío.
4. Si cambias [database/01_init.sql](database/01_init.sql), debes usar `docker compose down -v` antes de volver a levantar para que se regenere la base con `pgcrypto` y los nuevos datos.
5. Los roles canónicos del sistema son los que vienen desde la base de datos: `Administrador`, `Paciente` y `Medico`.
6. El registro actual crea la cuenta de autenticación en `usuarios`; el perfil clínico de `pacientes` sigue pendiente porque requiere campos que hoy no están en la vista de registro.



---

## Base de datos y seeds automáticos

El contenedor PostgreSQL ejecuta automáticamente todos los scripts SQL ubicados en la carpeta `database/` cuando la base de datos se crea desde cero (volumen vacío).

Actualmente se aplican en este orden:

1. `01_init.sql`
2. `02_seed_actualizado.sql`
3. `03_seed_medicos_extra.sql`

Esto permite contar con estructura, datos base y ampliación médica sin ejecutar comandos manuales.

---

## Primer uso del proyecto

```bash
docker compose up -d --build