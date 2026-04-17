# Seguridad de Contraseñas — MediConnect

**Fecha de registro:** Abril 2026

---

## Resumen del cambio

Se formalizó y documentó el contrato de seguridad para el manejo de contraseñas en el flujo de registro de usuarios. No se realizaron cambios funcionales en el frontend; el código ya operaba de forma correcta. El cambio consistió en hacer explícito y auditado el principio de seguridad, tanto en el código fuente como en la documentación del contrato de API.

---

## Qué se realizó

* **Qué se realizó:** Documentación explícita del contrato de seguridad para hashing de contraseñas en `auth.service.ts` y en `docs/API_CONTRACT.md`; creación de este archivo como registro permanente de la decisión de arquitectura de seguridad.
* **Qué se modificó:** Incorporación de bloque de advertencia de seguridad en el método `register()` del servicio de autenticación del frontend; adición de la sección "Seguridad: Manejo de Contraseñas" y el contrato completo de `POST /api/auth/register` en el documento de contrato de API.

---

## Principio de seguridad aplicado

La contraseña del usuario **nunca es hasheada en el frontend**. El formulario de registro captura la contraseña y la envía en texto plano a través de HTTPS hacia el backend. Es el backend el único componente autorizado para generar el hash antes de persistirlo en la base de datos.

Esta decisión protege contra el ataque conocido como "hash como contraseña": si el hash se generara en el cliente y un atacante obtuviera acceso a la base de datos, podría autenticarse directamente enviando el valor almacenado en `contrasena_hash`, sin necesidad de conocer la contraseña original.

---

## Responsabilidades por capa

* **Frontend (actual):** Valida formato de contraseña a nivel de experiencia de usuario (longitud mínima, mayúscula, número). Esta validación es únicamente de UX, no de seguridad.
* **Canal de transmisión:** HTTPS garantiza que la contraseña en texto plano no pueda ser interceptada en tránsito.
* **Backend (obligatorio al implementar):** Recibe la contraseña, genera el hash con bcrypt (salt rounds mínimo 12) y almacena únicamente el hash en la columna `usuarios.contrasena_hash`. Nunca registra la contraseña en logs.
* **Base de datos (PostgreSQL):** Almacena exclusivamente el hash en `usuarios.contrasena_hash VARCHAR(255)`. Nunca almacena la contraseña en texto plano.

---

## Flujo de registro completo (referencia)

* El usuario completa el formulario; el frontend valida reglas de formato.
* El frontend envía los datos por HTTPS; la contraseña viaja en texto plano dentro del canal cifrado.
* El backend valida reglas de negocio, aplica bcrypt al campo de contraseña y realiza el INSERT en la tabla `usuarios` con `id_rol = 2` (Paciente).
* Si el campo RUT está presente, el backend realiza el INSERT correspondiente en la tabla `pacientes` vinculando el `id_usuario` recién creado.
* El backend responde con código 201 y un mensaje de éxito. Nunca devuelve el hash ni la contraseña en la respuesta.

---

## Archivos relacionados

* `app/src/app/core/services/auth.service.ts` — Contiene el comentario de seguridad en `register()` y el bloque de reemplazo HTTP para cuando exista backend.
* `docs/API_CONTRACT.md` — Contiene el contrato completo de `POST /api/auth/register` y la sección de seguridad de contraseñas.
* `database/01_init.sql` — Define la columna `usuarios.contrasena_hash VARCHAR(255)` que recibe el hash generado por el backend.
