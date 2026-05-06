# Recuperación de contraseña – MediConnect

## Descripción

Se implementó el flujo de recuperación de contraseña para MediConnect utilizando:

- Tokens temporales seguros.
- PostgreSQL (`password_reset_tokens`).
- NodeMailer.
- Ethereal Email (sandbox).
- Frontend Ionic (`forgot-password` y `reset-password`).

El sistema actualmente funciona en modo sandbox/desarrollo para facilitar pruebas locales y demostraciones del proyecto.

---

# Flujo de funcionamiento

## 1. Acceder a recuperación de contraseña

Ingresar a:

```txt
http://localhost:8100/auth/forgot-password
```

O seleccionar:

```txt
¿Olvidaste tu contraseña?
```

---

## 2. Ingresar correo registrado

El usuario debe ingresar un correo existente dentro del sistema.

Ejemplo:

```txt
admin@mediconnect.cl
```

---

## 3. Generación de recuperación

El backend realiza automáticamente:

- generación de token seguro;
- almacenamiento del token en PostgreSQL;
- expiración automática del token (24 horas);
- generación de enlace temporal;
- envío de correo sandbox mediante Ethereal.

---

## 4. Visualizar enlace generado

Desde terminal, PowerShell o Bash ejecutar:

```bash
docker logs mediconnect-api --tail=100
```

En los logs aparecerá algo similar a:

```txt
[RECOVERY SANDBOX] ==============================
Usuario: correo@ejemplo.cl
Link recuperación: http://localhost:8100/auth/reset-password?token=...
Vista previa Ethereal: https://ethereal.email/message/...
================================================
```

---

## 5. Abrir recuperación

Se puede:

- abrir directamente el link localhost;
- o abrir la URL Ethereal para visualizar el correo completo.

---

## 6. Restablecer contraseña

El sistema redirige automáticamente a:

```txt
/auth/reset-password?token=...
```

El usuario puede:

- ingresar nueva contraseña;
- confirmar contraseña;
- actualizar credenciales.

---

# Requisitos importantes

## Tabla SQL necesaria

Si la base de datos ya existía antes de esta implementación, ejecutar:

```txt
database/04_password_reset_tokens.sql
```

Esto creará la tabla requerida para almacenar los tokens de recuperación.

---

# Tecnologías utilizadas

- Angular + Ionic.
- Node.js + Express.
- PostgreSQL.
- Docker.
- NodeMailer.
- Ethereal Email.

---

# Notas

- El sistema actualmente funciona en modo sandbox/desarrollo.
- Ethereal se utiliza únicamente para pruebas y demostraciones.
- El flujo puede migrarse posteriormente a SMTP real o servicios como Brevo, SendGrid o Resend.
- El token queda invalidado automáticamente después de utilizarse.
- El enlace de recuperación expira automáticamente después de 24 horas.
