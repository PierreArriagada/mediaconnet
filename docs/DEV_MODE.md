# Modo Desarrollo — Autenticación simulada

## Contexto

El backend REST todavía no existe en este repositorio. Para permitir el desarrollo del frontend, `AuthService` opera actualmente en modo mock: no hace llamadas HTTP reales y valida credenciales localmente.

La URL `http://localhost:3000/api` sigue configurada como destino del backend futuro, pero hoy el login no la usa.

---

## Credenciales de prueba

Estas credenciales corresponden a usuarios presentes en el seed de [database/01_init.sql](../database/01_init.sql):

| Email | Contraseña | Rol | Nombre |
|---|---|---|---|
| `paciente1@mediconnect.cl` | `mediconnect2026` | Paciente | Laura Mora |
| `medico1@mediconnect.cl` | `mediconnect2026` | Médico | Carlos Rojas |
| `admin@mediconnect.cl` | `mediconnect2026` | Administrador | Eduardo Guerrero |

Cualquier otra combinación devuelve error de autenticación.

---

## Sistema de roles

Los roles se originan en la tabla `roles`:

| ID | Nombre | Mapeo frontend |
|---|---|---|
| 1 | Administrador | `admin` |
| 2 | Paciente | `patient` |
| 3 | Médico | `doctor` |

---

## Flujo de navegación actual

1. La aplicación arranca en `/auth/login`.
2. El usuario ingresa email y contraseña.
3. `AuthService` valida las credenciales mock.
4. Si son correctas, guarda `token` y `user` en `localStorage`.
5. El usuario es redirigido a `/dashboard`.
6. El dashboard muestra nombre, rol y accesos rápidos deshabilitados.
7. El botón de cierre de sesión limpia el estado local y vuelve a `/auth/login`.

Si un usuario entra a `/dashboard` sin token, `authGuard` lo redirige al login.

---

## Qué muestra el dashboard

- saludo personalizado con el nombre del usuario
- badge con el rol en español
- accesos rápidos para citas, historial, notificaciones y perfil

Las tarjetas siguen deshabilitadas hasta que exista backend real para esas features.

---

## Paso a autenticación real

1. Implementar el backend descrito en [BACKEND_PLAN.md](./BACKEND_PLAN.md).
2. Sustituir en `AuthService` el bloque mock por la llamada HTTP ya comentada en el servicio.
3. Levantar el backend en `http://localhost:3000/api`.
4. Mantener la respuesta con la forma `{ token, user }`.
