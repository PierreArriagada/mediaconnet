# Contrato de API — MediConnect

Este documento define el contrato que el frontend espera del backend y deja explícito el estado real actual del proyecto.

---

## Estado actual

Hoy el login del frontend se resuelve en modo mock dentro de `AuthService`. La aplicación no ejecuta la llamada HTTP de autenticación mientras el backend no exista.

Eso significa:

- `environment.apiUrl` sigue definido como `http://localhost:3000/api`
- el interceptor de token ya está listo para peticiones reales futuras
- el flujo actual de login valida credenciales contra usuarios mock alineados con el seed de PostgreSQL

---

## Base URL esperada

| Entorno | URL |
|---|---|
| Desarrollo (backend futuro) | `http://localhost:3000/api` |
| Producción | Pendiente de configurar |

Configurado en `app/src/environments/environment.ts` y reservado para cuando exista el backend.

---

## Autenticación actual en modo mock

`AuthService.login()` acepta actualmente estas credenciales:



En éxito, el servicio guarda en `localStorage`:

- `token`
- `user`

En error, devuelve un objeto con `error.message` para que el login muestre el mensaje correspondiente.

---

## Contrato HTTP esperado para el backend

### POST `/api/auth/login`

Este es el contrato que debe cumplir el backend cuando se active la llamada real.

Request:

```json
{
  "email": "string",
  "password": "string"
}
```

Response 200:

```json
{
  "token": "string",
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "patient | doctor | admin"
  }
}
```

Response 401:

```json
{
  "message": "Credenciales inválidas"
}
```

### Autenticación en peticiones futuras

Todas las peticiones HTTP al backend incluirán automáticamente:

```text
Authorization: Bearer <token>
```

Esto lo implementa `tokenInterceptor`.

---

## Modelos del frontend

Modelos relevantes actualmente expuestos por el frontend:

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'patient' | 'doctor' | 'admin';
  avatarUrl?: string;
  createdAt?: string;
}

interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}
```

Y para autenticación:

```typescript
interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}
```

---

## Contrato de Registro

### POST `/api/auth/register`

Crea un nuevo usuario con rol Paciente (id_rol = 2). El campo `rut` y `telefono` son opcionales.

Request body:

```json
{
  "nombre":   "string (2-100 chars, solo letras)",
  "apellido":  "string (2-100 chars, solo letras)",
  "correo":    "string (email válido, máx 150 chars)",
  "password":  "string (mínimo 8 chars, 1 mayúscula, 1 número)",
  "telefono":  "string | null",
  "rut":       "string | null"
}
```

Response 201:

```json
{ "message": "Cuenta creada exitosamente." }
```

Response 409:

```json
{ "message": "Este correo ya está registrado." }
```

---

## Seguridad: Manejo de Contraseñas

### Principio fundamental

El frontend **nunca** hashea contraseñas. Envía `password` en texto plano sobre HTTPS. El backend es el único responsable del hash antes de persistir en base de datos.

**Por qué no hashear en el cliente:** si la contraseña se hasheara en el frontend, el hash se convierte en la credencial real. Un atacante con acceso a la base de datos podría autenticarse enviando directamente el valor de `contrasena_hash`, eliminando toda protección.

### Contrato del backend para la contraseña

- Algoritmo obligatorio: **bcrypt**
- Salt rounds mínimos: **12**
- Columna destino en PostgreSQL: `usuarios.contrasena_hash VARCHAR(255)`
- El campo `password` del request nunca debe registrarse en logs del servidor

### Flujo completo en registro

1. Frontend valida formato (longitud, mayúscula, número) — solo UX, no seguridad
2. Frontend envía `password` en texto plano por HTTPS al backend
3. Backend recibe, valida reglas de negocio, genera hash bcrypt
4. Backend realiza `INSERT` en `usuarios` con `contrasena_hash = hash_generado` e `id_rol = 2`
5. Si `rut` está presente, backend realiza `INSERT` en `pacientes` con `id_usuario` recién creado
6. Backend responde 201 — nunca devuelve el hash ni la contraseña

---

## Endpoints planificados

| Método | Endpoint | Feature | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/register` | Registro | Crear cuenta de paciente (ver contrato arriba) |
| `GET` | `/api/especialidades` | Citas | Listar especialidades activas |
| `GET` | `/api/medicos?especialidad=:id` | Citas | Médicos por especialidad |
| `GET` | `/api/disponibilidad/:medicoId` | Citas | Horarios disponibles |
| `POST` | `/api/citas` | Citas | Crear cita médica |
| `GET` | `/api/citas/paciente/:id` | Citas | Citas del paciente |
| `PATCH` | `/api/citas/:id` | Citas | Cancelar o reprogramar cita |
| `GET` | `/api/notificaciones` | Notificaciones | Lista de notificaciones |
| `PATCH` | `/api/notificaciones/:id/leer` | Notificaciones | Marcar como leída |

---

## Cambio a backend real

Para activar el backend real sin cambiar el resto del frontend:

1. Implementar `POST /api/auth/login` con el contrato anterior.
2. Reemplazar en `AuthService` el bloque mock por la llamada HTTP ya comentada en el servicio.
3. Levantar el backend en `http://localhost:3000/api`.
4. Mantener la respuesta con la forma `{ token, user }`.
