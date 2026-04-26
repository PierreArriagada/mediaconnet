# MediConnect

Monorepo full-stack para gestión médica con frontend Ionic/Angular, backend Express y PostgreSQL, operado con datos reales y flujo local basado en Docker.

## Punto de entrada

- Índice general de documentación: [docs/README.md](docs/README.md)
- Guía de arranque del entorno: [docs/proyecto/INICIO.md](docs/proyecto/INICIO.md)
- Flujo diario de desarrollo: [docs/proyecto/DEV_MODE.md](docs/proyecto/DEV_MODE.md)

## Estructura del repositorio

- [app](app) contiene el frontend Ionic/Angular standalone.
- [backend](backend) contiene la API REST Express con JWT y acceso a PostgreSQL.
- [database](database) contiene el esquema oficial, extensiones y seeds.
- [docs](docs) contiene la documentación separada por paciente, medico, admin y proyecto.

## Documentación por ámbito

- [docs/proyecto/README.md](docs/proyecto/README.md) agrupa arquitectura, contrato API, seguridad, arranque, modo desarrollo y lineamientos técnicos.
- [docs/paciente/README.md](docs/paciente/README.md) agrupa reserva, historial, perfil, detalle de cita y flujos asociados al paciente.
- [docs/medico/README.md](docs/medico/README.md) agrupa funciones exclusivas del profesional de salud.
- [docs/admin/README.md](docs/admin/README.md) reserva la documentación de backoffice y administración.

## Estado validado

- Frontend validado con Angular 21.2, Ionic 8.8, Capacitor 8.3 y TypeScript 5.9.
- Backend real en Node 24 + Express.
- PostgreSQL 18 inicializado desde [database](database).
- Roles canónicos del sistema: Administrador, Paciente y Medico.

## Arranque rápido con Docker

> Compatible con Windows, macOS y Linux.

1. Abrir Docker Desktop.
2. Abrir una terminal dentro de la carpeta raíz del proyecto.
3. Ejecutar:

```bash
docker compose up -d --build
```

4. Verificar estado de los contenedores:

```bash
docker compose ps
```

Estado esperado:

- `mediconnect-postgres`: `healthy`
- `mediconnect-api`: `Up`
- `mediconnect-app`: `Up`

Si el frontend no abre en el navegador, instalar dependencias y levantar Ionic manualmente:

```bash
docker exec mediconnect-app sh -c "cd /workspace && npm install"
docker exec -d mediconnect-app sh -c "cd /workspace && ionic serve --host=0.0.0.0 --port=8100 --poll=1000 --no-open --no-interactive > /tmp/serve.log 2>&1"
docker exec mediconnect-app sh -c "cat /tmp/serve.log"
```

Accesos locales:

- Frontend: http://localhost:8100
- Backend: http://localhost:3000
- PostgreSQL: localhost:5432

## Notas técnicas de entorno

- PostgreSQL 18 utiliza volumen persistente para mantener datos locales entre reinicios.
- Los scripts SQL se ejecutan automáticamente al inicializar una base limpia en este orden:

1. `database/01_init.sql`
2. `database/02_seed_actualizado.sql`
3. `database/03_seed_medicos_extra.sql`

Si se requiere reconstrucción completa del entorno:

```bash / terminal
docker compose down -v
docker compose up -d --build
```

> `docker compose down -v` elimina el volumen local de PostgreSQL y vuelve a crear la base de datos desde los scripts de la carpeta `database`.

- Después de actualizar el repositorio, es recomendable ejecutar `git pull` antes de levantar los contenedores.




## Reglas operativas

- El desarrollo local corre dentro de Docker.
- Los comandos de frontend se ejecutan dentro del contenedor `mediconnect-app`.
- La base de datos fuente está en [database](database) y la documentación debe reflejar datos reales de esa estructura.
- Todo cambio funcional debe documentarse en la carpeta correcta dentro de [docs](docs).
