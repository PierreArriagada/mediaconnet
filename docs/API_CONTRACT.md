# Contrato de API — MediConnect

Este documento define el contrato HTTP actual entre el frontend y el backend real disponible en `backend/`.

---

## Estado actual

La autenticación ya no es mock. `AuthService` hace llamadas HTTP reales a `http://localhost:3000/api/auth` y el backend valida contra PostgreSQL.

Eso significa:

- `environment.apiUrl` apunta al backend local activo
- `tokenInterceptor` ya está listo para enviar `Authorization: Bearer <token>`
- el login, registro y recuperación de contraseña ya pasan por la API real
- los roles que devuelve la API vienen desde la base de datos en español

---

## Base URL actual

| Entorno | URL |
|---|---|
| Desarrollo | `http://localhost:3000/api` |
| Producción | Pendiente de configurar |

Configurado en `app/src/environments/environment.ts`.

---

## Endpoints de autenticación activos

### POST `/api/auth/login`

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
    "role": "Administrador | Paciente | Medico"
  }
}
```

Response 400:

```json
{
  "message": "Datos inválidos"
}
```

Response 401:

```json
{
  "message": "Credenciales incorrectas. Verifica tu correo y contraseña."
}
```

Notas de comportamiento:

- la API busca el correo en `usuarios` con `estado = 'activo'`
- el rol se obtiene desde `roles.nombre_rol`
- la comparación de contraseña se hace con `pgcrypto`
- correo inexistente y contraseña incorrecta devuelven el mismo mensaje por seguridad

### POST `/api/auth/register`

Crea un usuario de autenticación con rol `Paciente` (`id_rol = 2`).

Request body:

```json
{
  "nombre": "string",
  "apellido": "string",
  "correo": "string",
  "password": "string",
  "telefono": "string | null",
  "rut": "string | null"
}
```

Validaciones actuales del backend:

- `nombre`: 2 a 100 caracteres, letras, espacios, guiones y apóstrofe
- `apellido`: 2 a 100 caracteres, mismas reglas que `nombre`
- `correo`: email válido
- `password`: mínimo 8 caracteres
- `telefono`: opcional, máximo 20 caracteres
- `rut`: opcional, máximo 12 caracteres

Response 201:

```json
{
  "message": "Cuenta creada exitosamente."
}
```

Response 400:

```json
{
  "message": "Datos inválidos"
}
```

Response 409:

```json
{
  "message": "Este correo ya está registrado. Intenta iniciar sesión."
}
```

Importante:

- el registro actual inserta solo en `usuarios`
- el rol queda forzado a `Paciente`
- `rut` se acepta en el contrato, pero todavía no se persiste en `pacientes`
- el frontend exige reglas de contraseña más estrictas por UX, pero el backend hoy solo garantiza longitud mínima 8

### POST `/api/auth/forgot-password`

Request:

```json
{
  "email": "string"
}
```

Response 200:

```json
{
  "message": "Si el correo está registrado, recibirás las instrucciones en breve."
}
```

Comportamiento actual:

- siempre responde `200`
- no revela si el correo existe
- todavía no envía correo real

---

## Autenticación en peticiones protegidas

Las rutas protegidas futuras usarán este formato:

```text
Authorization: Bearer <token>
```

La infraestructura ya existe en:

- frontend: `tokenInterceptor`
- backend: `requireAuth` y `requireRole`

---

## Modelos del frontend

Modelos relevantes actualmente expuestos por el frontend:

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'Paciente' | 'Medico' | 'Administrador';
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

## Seguridad de contraseñas

Principios vigentes:

- el frontend no hashea contraseñas
- el backend recibe `password` en texto plano sobre HTTPS
- PostgreSQL genera y valida el hash usando `pgcrypto`
- la columna persistida es `usuarios.contrasena_hash`
- la respuesta nunca devuelve ni contraseña ni hash

---

## Endpoints planificados

| Método | Endpoint | Feature | Descripción |
|---|---|---|---|
| `GET` | `/api/especialidades` | Citas | Listar especialidades activas |
| `GET` | `/api/medicos?especialidad=:id` | Citas | Médicos por especialidad |
| `GET` | `/api/disponibilidad/:medicoId` | Citas | Horarios disponibles |
| `POST` | `/api/citas` | Citas | Crear cita médica |
| `GET` | `/api/citas/paciente/:id` | Citas | Citas del paciente |
| `PATCH` | `/api/citas/:id` | Citas | Cancelar o reprogramar cita |
| `GET` | `/api/notificaciones` | Notificaciones | Lista de notificaciones |
| `PATCH` | `/api/notificaciones/:id/leer` | Notificaciones | Marcar como leída |
