# Seguridad de Contraseñas — MediConnect

**Fecha de revisión:** Abril 2026

---

## Resumen actual

La seguridad de contraseñas ya no es solo una decisión documentada: está implementada en el backend real de `backend/` y respaldada por PostgreSQL con `pgcrypto`.

---

## Qué se realizó

* **Qué se realizó:** Implementación real del registro y login contra PostgreSQL utilizando hash de contraseña gestionado por la base de datos; actualización del contrato de API y de la documentación técnica para reflejar el flujo activo.
* **Qué se modificó:** El frontend dejó de usar mocks de autenticación; el backend ahora inserta contraseñas hasheadas en `usuarios.contrasena_hash` y valida login con `crypt(password, contrasena_hash)`.

---

## Principio de seguridad aplicado

La contraseña del usuario **nunca se hashea en el frontend**. El cliente envía `password` en texto plano por HTTPS y el backend delega el hash a PostgreSQL mediante `pgcrypto`.

Esto evita el problema de "usar el hash como contraseña". Si el hash se generara en el cliente, cualquier actor con acceso al valor almacenado podría reutilizarlo directamente como credencial.

---

## Responsabilidades por capa

* **Frontend:** Valida reglas de formato para mejorar la experiencia de usuario. No genera hash ni persiste contraseñas.
* **Canal de transmisión:** La contraseña viaja en texto plano solo dentro de un canal HTTPS.
* **Backend:** Recibe el payload, valida formato, ejecuta el `INSERT` con `crypt($password, gen_salt('bf', 12))` y nunca devuelve ni registra la contraseña.
* **Base de datos:** Almacena exclusivamente el hash en `usuarios.contrasena_hash VARCHAR(255)` y realiza también la comparación segura durante el login.

---

## Flujo actual de registro y login

* El usuario completa el formulario y el frontend valida reglas de UX.
* El frontend envía `nombre`, `apellido`, `correo`, `password`, `telefono` y `rut` al backend.
* El backend inserta en `usuarios` con `id_rol = 2` (`Paciente`) y hash generado por `pgcrypto`.
* En login, el backend consulta `usuarios` + `roles` y compara con `u.contrasena_hash = crypt(password, u.contrasena_hash)`.
* Si la comparación es correcta, la API devuelve un JWT y los datos del usuario.

Limitación actual:

* El registro todavía no crea la fila en `pacientes`, porque esa tabla exige campos que la vista actual aún no captura, como `fecha_nacimiento`.

---

## Archivos relacionados

* `backend/src/controllers/auth.controller.js` — Inserta hash en el registro y valida la contraseña en login.
* `backend/src/routes/auth.routes.js` — Define validaciones y rate limiting para autenticación.
* `backend/src/config/jwt.config.js` — Centraliza secreto y expiración del token.
* `docs/API_CONTRACT.md` — Contrato HTTP actual de `login`, `register` y `forgot-password`.
* `database/01_init.sql` — Habilita `pgcrypto` y genera hashes reales para usuarios semilla.
