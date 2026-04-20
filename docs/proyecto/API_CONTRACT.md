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

- el registro crea en una transacción: el usuario en `usuarios` (rol `Paciente`) y un perfil provisional en `pacientes`
- el `rut` provisional se genera como `USR-{id_usuario}` hasta que el paciente complete su perfil
- `fecha_nacimiento` provisional: `2000-01-01`
- esto garantiza que el usuario recién registrado puede reservar citas inmediatamente
- el rol queda forzado a `Paciente`
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

## Endpoints del paciente

### GET `/api/paciente/dashboard`

Devuelve la próxima cita activa del paciente autenticado y sus últimas 5 notificaciones.

Requiere: `Authorization: Bearer <token>` con rol `Paciente`.

Response 200:

- `proximaCita`: objeto con los datos de la próxima cita confirmada o pendiente (puede ser `null` si no hay)
- `notificaciones`: lista de hasta 5 notificaciones recientes
- `noLeidas`: entero con el total de notificaciones no leídas (usado para el badge del header)

Errores posibles:

- `401` si el token es inválido o ha expirado
- `403` si el usuario no tiene rol `Paciente`
- `500` ante error de base de datos

Notas de comportamiento:

- el `id_usuario` se extrae exclusivamente del JWT, nunca del cuerpo de la petición (prevención de IDOR)
- la próxima cita considera solo `estado_cita IN ('pendiente', 'confirmada')` con `fecha_cita >= CURRENT_DATE`
- las notificaciones se ordenan por `fecha_envio DESC`

---

## Autenticación en peticiones protegidas

Todas las rutas bajo `/api/paciente/`, `/api/medico/` y `/api/admin/` requieren:

```text
Authorization: Bearer <token>
```

La infraestructura ya existe en:

- frontend: `tokenInterceptor` (aplica automáticamente a todas las peticiones)
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

## Endpoints del paciente (completos)

Todos requieren `Authorization: Bearer <token>` con rol `Paciente`.

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/paciente/dashboard` | Próxima cita + últimas 5 notificaciones + badge no leídas |
| `GET` | `/api/paciente/especialidades` | Especialidades activas + badge no leídas |
| `GET` | `/api/paciente/profesionales/:idEspecialidad` | Médicos activos de la especialidad con sus próximos 3 slots |
| `GET` | `/api/paciente/medico/:idMedico` | Perfil enriquecido del médico: bio, valoración, horario, próximo slot |
| `GET` | `/api/paciente/medico/:idMedico/disponibilidad` | Slots disponibles del médico agrupados por fecha |
| `POST` | `/api/paciente/reservar` | Crear cita médica (transaccional, FOR UPDATE en slot) |
| `GET` | `/api/paciente/cita/:idCita` | Detalle completo de una cita del paciente autenticado |
| `PATCH` | `/api/paciente/cita/:idCita/cancelar` | Cancelar cita pendiente o confirmada, libera slot |
| `PATCH` | `/api/paciente/cita/:idCita/reagendar` | Reagendar cita a nuevo slot del mismo médico |

### GET `/api/paciente/cita/:idCita`

- prevención IDOR: verifica que la cita pertenezca al paciente del JWT
- devuelve datos del médico (nombre, biografía, valoración), especialidad, disponibilidad y estado
- campos: `id_cita`, `fecha_cita`, `hora_cita`, `estado_cita`, `motivo_consulta`, `modalidad`, `observaciones`, datos del médico y especialidad

### PATCH `/api/paciente/cita/:idCita/cancelar`

- solo acepta citas con `estado_cita IN ('pendiente', 'confirmada')`
- libera el slot: `disponibilidad_medica.estado = 'disponible'`
- crea notificación de tipo `cancelacion`
- operación transaccional

### PATCH `/api/paciente/cita/:idCita/reagendar`

Request body:
- `id_disponibilidad`: nuevo slot del mismo médico

- verifica que el nuevo slot pertenezca al mismo médico y esté disponible
- usa doble `FOR UPDATE` para evitar condición de carrera
- libera slot anterior, reserva nuevo slot, actualiza `fecha_cita` y `hora_cita` en la cita
- crea notificación de tipo `reprogramacion`
- operación transaccional

## Endpoints públicos de citas

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/citas/especialidades` | Especialidades activas (sin autenticación) |
| `POST` | `/api/citas/invitado` | Crear cita como invitado sin cuenta |

## Endpoints pendientes de implementar

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/notificaciones` | Lista paginada de notificaciones |
| `PATCH` | `/api/notificaciones/:id/leer` | Marcar notificación como leída |
| `GET` | `/api/paciente/historial` | Historial de atenciones completadas |
| `GET` | `/api/paciente/perfil` | Perfil clínico del paciente |
| `PATCH` | `/api/paciente/perfil` | Actualizar perfil (rut, fecha_nacimiento, etc.) |
