# Modo Desarrollo — Frontend + Backend + PostgreSQL

## Contexto

El proyecto ya corre como un entorno full-stack local:

- frontend Ionic/Angular en `http://localhost:8100`
- backend Express en `http://localhost:3000/api`
- PostgreSQL 18 en `localhost:5432`

`docker compose up -d --build` levanta la API y la base de datos. `ionic serve` sigue iniciándose manualmente dentro del contenedor `mediconnect-app`.

---

## Credenciales semilla

Estas credenciales están creadas en [database/01_init.sql](../../database/01_init.sql) y autentican contra la base real:

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@mediconnect.cl` | `mediconnect2026` |
| Paciente | `paciente1@mediconnect.cl` | `mediconnect2026` |
| Medico | `medico1@mediconnect.cl` | `mediconnect2026` |

Cualquier otra combinación válida a nivel de formato, pero inexistente en la base, devuelve error de autenticación.

---

## Sistema de roles

Los roles se originan en la tabla `roles` y deben tratarse exactamente así:

- `Administrador`
- `Paciente`
- `Medico`

En interfaz el dashboard puede mostrar `Médico` como etiqueta visual, pero el valor canónico del sistema sigue siendo `Medico`.

---

## Flujo actual de autenticación

1. La aplicación arranca en `/auth/login`.
2. El usuario ingresa email y contraseña.
3. `AuthService` envía `POST /api/auth/login` al backend.
4. El backend consulta PostgreSQL y valida el hash con `pgcrypto`.
5. Si las credenciales son correctas, responde `{ token, user }`.
6. El frontend guarda `token` y `user` en `localStorage`.
7. El usuario es redirigido a `/dashboard`.
8. Si el token no existe, `authGuard` redirige a `/auth/login`.

---

## Registro actual

El registro ya no es simulado.

Comportamiento actual:

- crea un nuevo registro en `usuarios`
- fuerza `id_rol = 2` (`Paciente`)
- guarda la contraseña como hash con `pgcrypto`
- permite iniciar sesión inmediatamente con el correo recién creado

Limitación actual:

- todavía no crea el perfil clínico en `pacientes`
- por eso, al validar el usuario nuevo, debes mirar la tabla `usuarios`, no `pacientes`

---

## Recuperación de contraseña actual

El endpoint existe y responde correctamente, pero aún no hay envío real de correo.

Comportamiento actual:

- siempre responde con el mismo mensaje
- no expone si el correo existe o no
- sirve para dejar estable el flujo de UI y el contrato de seguridad

---

## Qué muestra hoy el dashboard

- saludo personalizado con el nombre del usuario autenticado
- badge con el rol en español
- accesos rápidos de interfaz para módulos futuros

Las tarjetas siguen mayormente como placeholder hasta que se implementen los módulos de citas, disponibilidad y notificaciones en el backend.

---

## Comandos útiles de validación

```bash
docker compose logs mediconnect-api --tail=50
docker exec mediconnect-postgres psql -U postgres -d mediconnect -c "SELECT id_usuario, correo, id_rol, estado FROM usuarios ORDER BY id_usuario;"
docker exec mediconnect-postgres psql -U postgres -d mediconnect -c "SELECT id_rol, nombre_rol FROM roles ORDER BY id_rol;"
```
