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

## Reglas operativas

- El desarrollo local corre dentro de Docker.
- Los comandos de frontend se ejecutan dentro del contenedor `mediconnect-app`.
- La base de datos fuente está en [database](database) y la documentación debe reflejar datos reales de esa estructura.
- Todo cambio funcional debe documentarse en la carpeta correcta dentro de [docs](docs).