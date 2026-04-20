# Arquitectura — MediConnect

## 1. Monorepo por servicios

La raíz del proyecto separa cada responsabilidad técnica en una carpeta propia:

```text
MediConnect/
├── app/        frontend Ionic/Angular
├── backend/    API REST Express
├── database/   esquema, seeds y extensiones PostgreSQL
├── docs/       documentación funcional y técnica
└── docker-compose.yml
```

Esta separación es la estructura correcta para 2026 en un proyecto full-stack grande porque evita mezclar código que corre en el navegador con código que corre en el servidor.

## 2. Frontend standalone

Todo el frontend usa Angular standalone. No hay `NgModule` en la aplicación activa. Los providers globales se configuran en `app.config.ts` mediante `bootstrapApplication()`.

Estructura principal:

```text
app/src/app/
├── core/             servicios singleton, guards, interceptors y modelos
├── shared/           componentes, pipes y directivas reutilizables
├── features/
│   ├── auth/         login, registro y restablecimiento de contraseña
│   ├── dashboard/    vista de redireccionamiento post-login
│   └── paciente/     módulo completo del paciente (home, reservar, citas, etc.)
├── layouts/          shells reutilizables
├── app.routes.ts     rutas raíz con lazy loading
├── app.config.ts     providers globales
└── app.component.ts  shell raíz mínima
```

Convención: cada feature expone su propio array `*_ROUTES` y se carga de forma diferida desde `app.routes.ts`.

## 3. Backend Express modular

El backend ya existe dentro de `backend/` y está organizado por capas simples y explícitas:

```text
backend/src/
├── config/       configuración centralizada (JWT)
├── controllers/  lógica HTTP de cada endpoint
├── db/           conexión PostgreSQL
├── middleware/   autenticación, autorización y manejo de errores
├── routes/       definición de rutas Express
└── server.js     bootstrap del servidor
```

Esta estructura es suficiente para crecer sin convertir el backend en un archivo único difícil de mantener.

## 4. Autenticación y sesión

- `AuthService` consume el backend real vía `http://localhost:3000/api/auth`.
- `tokenInterceptor` agrega `Authorization: Bearer <token>` a peticiones autenticadas.
- `authGuard` protege rutas privadas revisando el token local.
- El backend valida credenciales contra `usuarios` + `roles` usando PostgreSQL y `pgcrypto`.
- El JWT actual contiene `{ id, email, name, role }`.
- Los valores de rol vienen desde la base de datos y se tratan en español: `Administrador`, `Paciente`, `Medico`.

Estado actual:

- login real implementado
- registro real implementado — crea `usuarios` + perfil provisional en `pacientes` en una sola transacción
- el usuario recién registrado puede reservar citas inmediatamente (perfil provisional `rut=USR-{id}`, `fecha_nacimiento=2000-01-01`)
- recuperación de contraseña con respuesta genérica implementada
- refresh token, revocación y expiración persistida todavía no implementados

## 5. Entorno Docker

Todo el desarrollo local corre dentro de Docker:

- `mediconnect-app`: frontend Ionic/Angular.
- `mediconnect-api`: backend Node.js + Express con `node --watch` en desarrollo.
- `mediconnect-postgres`: PostgreSQL 18 Alpine con inicialización automática desde `database/01_init.sql`.

No se requiere instalar Node, Angular CLI, Ionic CLI ni PostgreSQL en la máquina host.

## 6. Base de datos

- Motor actual: PostgreSQL 18.
- `database/01_init.sql` crea esquema, índices, triggers, datos semilla y la extensión `pgcrypto`.
- Las contraseñas semilla ya no son placeholders: se generan con `crypt(..., gen_salt('bf', 12))`.
- El endpoint de registro inserta en `usuarios` con `id_rol = 2` (`Paciente`) **y** crea un perfil provisional en `pacientes` dentro de la misma transacción.
- El perfil provisional usa `rut = 'USR-{id_usuario}'` como valor temporal y `fecha_nacimiento = '2000-01-01'` hasta que el paciente actualice su perfil.

## 7. Seguridad aplicada

Controles ya implementados en el backend:

- `helmet` para cabeceras HTTP seguras.
- `cors` restringido a `http://localhost:8100` y `http://localhost:4200`.
- límite global de requests y límite específico en `/api/auth/*`.
- límite de `10kb` para cuerpos JSON.
- validación y sanitización básica con `express-validator`.
- consultas parametrizadas con `pg`.
- `JWT_SECRET` obligatorio al iniciar la API.
- middleware `requireAuth` y `requireRole` listos para rutas protegidas.
- respuesta genérica en login fallido y recuperación de contraseña para evitar enumeración de usuarios.

## 8. Stack verificado

Estado validado en abril de 2026 dentro del entorno Docker del proyecto:

| Componente | Versión activa | Observación |
|---|---|---|
| Angular | 21.2.x | frontend standalone |
| Ionic Angular | 8.8.x | integrado con standalone |
| Capacitor | 8.3.x | CLI, core y Android alineados |
| TypeScript | 5.9.3 | toolchain frontend |
| Node.js | 24 LTS | frontend y backend |
| Express | 4.21.x | API REST actual |
| PostgreSQL | 18 | motor de base de datos |
| ESLint | 9.39.4 | validado en frontend |

## 9. Pendientes de arquitectura

1. Completar el módulo de pacientes para que el registro cree también el perfil clínico en `pacientes`.
2. Agregar módulos de especialidades, médicos, disponibilidad, citas y notificaciones al backend.
3. Incorporar expiración gestionada, refresh token y revocación de JWT si el alcance del proyecto lo requiere.
