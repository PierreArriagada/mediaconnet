# Arquitectura — MediConnect

## Decisiones de arquitectura

### 1. Frontend standalone

Todo el proyecto usa Angular standalone. No hay `NgModule` en la aplicación activa. Los providers globales se configuran en `app.config.ts` mediante `bootstrapApplication()`.

Razones principales:

- lazy loading simple con `loadChildren()` y `loadComponent()`
- menor sobrecarga estructural que un árbol de módulos
- alineación con la dirección actual de Angular 21

### 2. Estructura de carpetas

```text
app/src/app/
├── core/             servicios singleton, guards, interceptors y modelos
├── shared/           componentes, pipes y directivas reutilizables
├── features/
│   ├── auth/         login y registro
│   ├── dashboard/    vista principal protegida
│   └── appointments/ feature reservada para citas
├── layouts/          shells futuros, por ahora placeholders documentados
├── app.routes.ts     rutas raíz con lazy loading
├── app.config.ts     providers globales
└── app.component.ts  shell raíz mínima
```

Convención: cada feature expone su propio array `*_ROUTES` y se carga de forma diferida desde `app.routes.ts`.

### 3. Autenticación

- `authGuard` protege rutas privadas revisando el token en `localStorage`.
- `tokenInterceptor` agrega `Authorization: Bearer <token>` a peticiones HTTP futuras.
- `AuthService` mantiene el estado de sesión y hoy resuelve el login en modo mock.
- No existe todavía expiración de token, refresh token ni validación contra backend real.

### 4. Entorno Docker

Todo el desarrollo local corre dentro de Docker:

- `mediconnect-app`: Node 24 Alpine con Angular CLI 21.2.7, Ionic CLI y Capacitor CLI 8.3.1.
- `mediconnect-postgres`: PostgreSQL 18 Alpine con inicialización automática desde `database/01_init.sql`.

No se requiere instalar Node, Angular CLI ni Ionic CLI en la máquina host.

### 5. Base de datos

- Motor actual: PostgreSQL 18.
- El esquema se crea automáticamente al primer `docker compose up` sobre un volumen vacío.
- `database/01_init.sql` define tablas, índices, triggers y datos semilla.
- El seed mantiene coherencia con las credenciales mock disponibles en el frontend.

### 6. Backend futuro

El frontend conserva `http://localhost:3000/api` como base esperada para el backend, pero el backend todavía no está incluido en este repositorio.

Requisitos mínimos del servicio futuro:

- endpoint `POST /api/auth/login` que devuelva `{ token, user }`
- autenticación JWT
- conexión a la misma base PostgreSQL expuesta por `mediconnect-postgres`

Ver [API_CONTRACT.md](./API_CONTRACT.md) y [BACKEND_PLAN.md](./BACKEND_PLAN.md).

---

## Stack verificado

Estado validado en abril de 2026 dentro del contenedor Docker del proyecto:

| Componente | Versión activa | Observación |
|---|---|---|
| Angular | 21.2.x | build verificado |
| Ionic Angular | 8.8.x | integrado con standalone |
| Capacitor | 8.3.x | CLI y core alineados |
| TypeScript | 5.9.3 | última rama compatible con `@angular-devkit/build-angular` 21 |
| ESLint | 9.39.4 | última versión compatible con `eslint-plugin-import` 2.32.0 |
| Node.js | 24 LTS | usado en Docker |
| PostgreSQL | 18 | usado en Docker Compose |

## Notas de toolchain

- El build sigue usando `@angular-devkit/build-angular:browser` en `angular.json` y compila correctamente en Angular 21.
- El lint quedó actualizado al máximo conjunto compatible del ecosistema actual. ESLint 10 no se usa porque `eslint-plugin-import` todavía declara peer dependency hasta ESLint 9.
- Las pruebas unitarias siguen sobre Jasmine y Karma 6.4.x. La imagen Docker incluye Chromium para ejecutar `npm run test:ci` dentro del contenedor.
