# Inicio de MediConnect

Guía paso a paso para que cualquier integrante del equipo clone el repositorio y tenga el proyecto funcionando con frontend, backend y base de datos reales.

> **Importante**: todas las herramientas del proyecto (`ionic`, `ng`, `npm`) están instaladas **dentro de Docker**, no en Windows. Nunca ejecutar esos comandos directamente en PowerShell o CMD. Siempre usar `docker exec mediconnect-app …` para el frontend.

---

## Requisitos previos

1. **Docker Desktop** instalado y corriendo ([descargar](https://www.docker.com/products/docker-desktop/)).
2. **Git** para clonar el repositorio.
3. Puertos `8100`, `3000` y `5432` libres en tu máquina.

No necesitas instalar Node.js, npm, Ionic, Angular ni PostgreSQL en tu máquina. Todo eso vive dentro de los contenedores.

---

## Paso 1 — Clonar el repositorio

```bash
git clone <URL-del-repo> MediConnect
cd MediConnect
```

---

## Paso 2 — Construir y levantar los contenedores

```bash
docker compose up -d --build
```

Esto hace lo siguiente automáticamente:

- construye la imagen del frontend desde `Dockerfile`
- construye la imagen del backend desde `backend/Dockerfile`
- levanta el contenedor **mediconnect-app**
- levanta el contenedor **mediconnect-api**
- levanta el contenedor **mediconnect-postgres**
- ejecuta `database/01_init.sql` sobre PostgreSQL cuando el volumen está vacío
- habilita `pgcrypto` y carga usuarios semilla con contraseñas hasheadas

Verifica que los tres contenedores estén arriba:

```bash
docker ps
```

Debes ver `mediconnect-app`, `mediconnect-api` y `mediconnect-postgres` con estado `Up`.

---

## Paso 3 — Instalar dependencias del frontend

```bash
docker exec mediconnect-app sh -c "cd /workspace && npm install"
```

Debe terminar sin errores. Esto instala Angular 21, Ionic 8, Capacitor 8 y todas las dependencias declaradas en `app/package.json` dentro del contenedor del frontend.

> **¿Cuándo repetir esto?** Solo si es la primera vez, si ejecutaste `docker compose down -v`, o si cambió `app/package.json`.

> **Backend:** no necesitas ejecutar `npm install` manualmente en `backend/`; sus dependencias se instalan durante el build de la imagen `mediconnect-api`.

---

## Paso 4 — Verificar que el backend está listo

```bash
docker compose logs mediconnect-api --tail=30
```

Debes ver mensajes equivalentes a:

```text
Conexión a PostgreSQL establecida.
API MediConnect corriendo en puerto 3000
```

Si no aparecen, revisa la sección de problemas comunes antes de intentar login o registro.

---

## Paso 5 — Verificar que no haya un servidor Ionic previo corriendo

```bash
docker exec mediconnect-app sh -c "ps aux | grep 'ng run app:serve' | grep -v grep"
```

Si devuelve alguna línea, hay un servidor activo. Antes de iniciar uno nuevo, detenlo:

```bash
docker exec mediconnect-app sh -c "pkill -f 'ionic'; pkill -f 'ng run app:serve'; echo ok"
```

> **¿Por qué?** Si el puerto 8100 ya está ocupado dentro del contenedor, Ionic inicia en el 8101. El 8101 no está mapeado en `docker-compose.yml`, así que la app no será accesible desde tu navegador.

---

## Paso 6 — Iniciar el servidor de desarrollo del frontend

```bash
docker exec -d mediconnect-app sh -c "cd /workspace && ionic serve --host=0.0.0.0 --port=8100 --live-reload-port=49153 --poll=1000 --no-open --no-interactive > /tmp/serve.log 2>&1"
```

Esto inicia Ionic en segundo plano dentro del contenedor. El `-d` hace que la terminal no se quede bloqueada.

> **`--poll=1000`**: Windows no reenvía eventos del sistema de archivos al contenedor Linux. El flag activa un escaneo activo cada 1 segundo para que Angular detecte tus cambios y recargue el navegador automáticamente sin reiniciar Docker.

---

## Paso 7 — Verificar que el frontend compiló correctamente

Espera unos 15 segundos y revisa el log:

```bash
docker exec mediconnect-app sh -c "cat /tmp/serve.log"
```

Debes ver al final:

```text
✔ Compiled successfully.
[INFO] Development server running!
       Local: http://localhost:8100
```

Si no aparece todavía, espera un poco más y vuelve a ejecutar el `cat`.

---

## Paso 8 — Abrir la aplicación

Abre en tu navegador:

```text
http://localhost:8100
```

Redirige automáticamente al login.

---

## Credenciales semilla

El login autentica contra PostgreSQL real a través del backend. Puedes usar estas cuentas:

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@mediconnect.cl` | `mediconnect2026` |
| Paciente | `paciente1@mediconnect.cl` | `mediconnect2026` |
| Medico | `medico1@mediconnect.cl` | `mediconnect2026` |

También puedes registrarte desde la vista de registro. Ese usuario nuevo quedará guardado en la tabla `usuarios` con rol `Paciente`.

---

## Resumen rápido — Primera vez (o después de `down -v`)

Ejecuta estos comandos en orden, uno por uno:

```bash
docker compose up -d --build
docker exec mediconnect-app sh -c "cd /workspace && npm install"
docker compose logs mediconnect-api --tail=30
docker exec mediconnect-app sh -c "pkill -f 'ionic'; pkill -f 'ng run app:serve'; echo ok"
docker exec -d mediconnect-app sh -c "cd /workspace && ionic serve --host=0.0.0.0 --port=8100 --live-reload-port=49153 --poll=1000 --no-open --no-interactive > /tmp/serve.log 2>&1"
docker exec mediconnect-app sh -c "cat /tmp/serve.log"
```

Luego abrir `http://localhost:8100`.

---

## Inicio diario — Después de apagar la laptop

Los contenedores conservan su estado (incluyendo `node_modules`). Solo necesitas reanudarlos e iniciar el servidor de desarrollo:

```bash
docker compose up -d
```

Verifica que los tres contenedores estén arriba:

```bash
docker ps
```

Mata cualquier servidor Ionic que haya quedado pendiente:

```bash
docker exec mediconnect-app sh -c "pkill -f 'ionic'; pkill -f 'ng run app:serve'; echo ok"
```

Inicia el servidor de desarrollo:

```bash
docker exec -d mediconnect-app sh -c "cd /workspace && ionic serve --host=0.0.0.0 --port=8100 --live-reload-port=49153 --poll=1000 --no-open --no-interactive > /tmp/serve.log 2>&1"
```

Espera ~20 segundos y verifica que compiló:

```bash
docker exec mediconnect-app sh -c "cat /tmp/serve.log"
```

Borrar caché de Angular si los cambios no se reflejan:

```bash
docker exec mediconnect-app sh -c "rm -rf /workspace/.angular/cache"
```

Debes ver `✔ Compiled successfully.` al final. Luego abrir `http://localhost:8100`.

> **¿Cuándo usar el resumen completo (con `--build` y `npm install`)?** Solo cuando hay cambios en `Dockerfile`, `backend/Dockerfile`, `docker-compose.yml`, `app/package.json`, o si ejecutaste `docker compose down -v`.

---

## Validaciones opcionales

### Verificar que el build de producción funciona

```bash
docker exec mediconnect-app sh -c "cd /workspace && npm run build"
```

### Verificar que el lint pasa

```bash
docker exec mediconnect-app sh -c "cd /workspace && npm run lint"
```

### Ejecutar los tests del frontend

```bash
docker exec mediconnect-app sh -c "cd /workspace && npm run test:ci"
```

### Ver las tablas de la base de datos

```bash
docker exec mediconnect-postgres psql -U postgres -d mediconnect -c "\dt"
```

### Ver usuarios registrados en la base real

```bash
docker exec mediconnect-postgres psql -U postgres -d mediconnect -c "SELECT id_usuario, correo, id_rol, estado FROM usuarios ORDER BY id_usuario;"
```

### Ver los roles canónicos del sistema

```bash
docker exec mediconnect-postgres psql -U postgres -d mediconnect -c "SELECT id_rol, nombre_rol FROM roles ORDER BY id_rol;"
```

---

## Mantenimiento

### Detener los contenedores sin perder datos

```bash
docker compose down
```

### Reiniciar desde cero la base de datos y los volúmenes

```bash
docker compose down -v
docker compose up -d --build
docker exec mediconnect-app sh -c "cd /workspace && npm install"
```

### Reconstruir solo el backend

```bash
docker compose up -d --build mediconnect-api
```

### Abrir shell dentro del contenedor del frontend

```bash
docker exec -it mediconnect-app sh
```

### Ejecutar consultas SQL no interactivas

```bash
docker exec mediconnect-postgres psql -U postgres -d mediconnect -c "SELECT NOW();"
```

### Abrir consola interactiva de PostgreSQL

```bash
docker exec -it mediconnect-postgres psql -U postgres -d mediconnect
```

---

## Problemas comunes

### `ionic: The term 'ionic' is not recognized`

Estás ejecutando el comando en Windows. Ionic está dentro del contenedor Docker. Usa `docker exec mediconnect-app sh -c "..."`.

### La app no carga en `http://localhost:8100`

1. Verifica el log del frontend: `docker exec mediconnect-app sh -c "cat /tmp/serve.log"`.
2. Si el log dice `Local: http://localhost:8101`, hay otro servidor ocupando el 8100. Mata todos y reinicia.
3. Si no hay log, el servidor no se inició. Repite el paso 6.

### El login o el registro fallan aunque la app abrió

1. Verifica que la API esté arriba: `docker compose logs mediconnect-api --tail=50`.
2. Verifica que PostgreSQL esté arriba: `docker compose logs mediconnect-postgres --tail=50`.
3. Si cambiaste `database/01_init.sql`, reinicia con `docker compose down -v` y vuelve a levantar.

### Me registré y no encuentro el usuario en la base

Consulta la tabla `usuarios`:

```bash
docker exec mediconnect-postgres psql -U postgres -d mediconnect -c "SELECT id_usuario, correo, id_rol FROM usuarios WHERE correo = 'tu_correo@ejemplo.com';"
```

El registro crea en una transacción: la cuenta en `usuarios` (rol `Paciente`) y un perfil en `pacientes` con el RUT real ingresado. Si el RUT ya tenía una solicitud como invitado, ese registro se vincula automáticamente.

### `docker exec -it mediconnect-postgres psql ...` falla en la terminal integrada

Usa consultas no interactivas con `-c` o ejecuta el modo interactivo desde una terminal externa. En VS Code suele ser más estable usar comandos de una sola ejecución.

### VS Code marca errores rojos en los imports de Angular

Es normal. Los `node_modules` viven dentro del contenedor, no en tu máquina. El proyecto compila y funciona correctamente en Docker. Si quieres autocompletado local, instala dependencias también en `app/` de tu host bajo tu propio criterio.

---

## Estructura relevante

```text
MediConnect/
├── Dockerfile                 imagen del frontend
├── docker-compose.yml         orquesta app, api y postgres
├── backend/                   API REST Node.js + Express
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── db/
│       ├── middleware/
│       └── routes/
├── database/
│   └── 01_init.sql            esquema, seeds y pgcrypto
└── app/                       frontend Ionic/Angular
    ├── package.json
    ├── karma.conf.js
    └── src/
        ├── environments/
        └── app/
            ├── core/
            ├── features/
            ├── layouts/
            └── shared/
```

---

## Documentos complementarios

- [../../README.md](../../README.md) — README principal del proyecto
- [../README.md](../README.md) — Indice general de documentacion
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Arquitectura actual de frontend, backend y base de datos
- [API_CONTRACT.md](./API_CONTRACT.md) — Contrato HTTP real del backend
- [BACKEND_PLAN.md](./BACKEND_PLAN.md) — Estado actual del backend y roadmap
- [DEV_MODE.md](./DEV_MODE.md) — Detalles del flujo local de desarrollo
- [SECURITY_PASSWORD.md](./SECURITY_PASSWORD.md) — Decisiones e implementación de seguridad de contraseñas
