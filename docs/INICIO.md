# Inicio de MediConnect

Guía paso a paso para que cualquier integrante del equipo clone el repositorio y tenga el proyecto funcionando.

> **Importante**: todas las herramientas del proyecto (`ionic`, `ng`, `npm`) están instaladas **dentro del contenedor Docker**, no en Windows. Nunca ejecutar esos comandos directamente en PowerShell o CMD. Siempre usar `docker exec mediconnect-app …`.

---

## Requisitos previos

1. **Docker Desktop** instalado y corriendo ([descargar](https://www.docker.com/products/docker-desktop/)).
2. **Git** para clonar el repo.
3. Puertos `8100` y `5432` libres en tu máquina.

No necesitas instalar Node.js, npm, Ionic ni Angular en tu máquina. Todo eso viene dentro de la imagen Docker.

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

- Descarga la imagen base `node:24-alpine`.
- Instala dentro del contenedor: `git`, `python3`, `make`, `g++`, `chromium`.
- Instala los CLIs globales: `@angular/cli`, `@ionic/cli`, `@capacitor/cli`.
- Levanta el contenedor **mediconnect-app** con el código fuente montado.
- Levanta el contenedor **mediconnect-postgres** con PostgreSQL 18.
- Ejecuta automáticamente el script `database/01_init.sql` que crea todas las tablas y datos de prueba.

Verifica que ambos contenedores estén corriendo:

```bash
docker ps
```

Debes ver `mediconnect-app` y `mediconnect-postgres` con estado `Up`.

---

## Paso 3 — Instalar dependencias del frontend

```bash
docker exec mediconnect-app sh -c "cd /workspace && npm install"
```

Debe terminar sin errores. Esto instala Angular 21, Ionic 8, Capacitor 8 y todas las dependencias declaradas en `app/package.json` **dentro del contenedor**.

> **¿Cuándo repetir esto?** Solo si es la primera vez, si ejecutaste `docker compose down -v`, o si cambió `app/package.json`.

---

## Paso 4 — Verificar que no haya un servidor previo corriendo

```bash
docker exec mediconnect-app sh -c "ps aux | grep 'ng run app:serve' | grep -v grep"
```

Si devuelve alguna línea, hay un servidor activo. Antes de iniciar uno nuevo, detenlo:

```bash
docker exec mediconnect-app sh -c "pkill -f 'ionic'; pkill -f 'ng run app:serve'; echo ok"
```

> **¿Por qué?** Si el puerto 8100 ya está ocupado dentro del contenedor, Ionic inicia en el 8101. El 8101 **no está mapeado** en `docker-compose.yml`, así que la app no será accesible desde tu navegador.

---

## Paso 5 — Iniciar el servidor de desarrollo

```bash
docker exec -d mediconnect-app sh -c "cd /workspace && ionic serve --host=0.0.0.0 --port=8100 --poll=1000 --no-open --no-interactive > /tmp/serve.log 2>&1"
```

Esto inicia Ionic en segundo plano dentro del contenedor. El `-d` hace que la terminal no se quede bloqueada.

> **`--poll=1000`**: Windows no reenvía eventos del sistema de archivos al contenedor Linux (limitación de WSL2/Hyper-V). El flag activa un escaneo activo cada 1 segundo para que Angular detecte tus cambios y recargue el navegador automáticamente sin reiniciar Docker.

---

## Paso 6 — Verificar que compiló correctamente

Espera unos 15 segundos y revisa el log:

```bash
docker exec mediconnect-app sh -c "cat /tmp/serve.log"
```

Debes ver al final:

```
✔ Compiled successfully.
[INFO] Development server running!
       Local: http://localhost:8100
```

Si no aparece todavía, espera un poco más y vuelve a ejecutar el `cat`.

---

## Paso 7 — Abrir la aplicación

Abre en tu navegador:

```
http://localhost:8100
```

Redirige automáticamente al login.

---

## Credenciales de prueba

El login funciona en modo mock (sin backend). Usa cualquiera de estas cuentas:


---

## Resumen rápido (copiar y pegar)

```bash
docker compose up -d --build
docker exec mediconnect-app sh -c "cd /workspace && npm install"
docker exec mediconnect-app sh -c "pkill -f 'ionic'; pkill -f 'ng run app:serve'; echo ok"
docker exec -d mediconnect-app sh -c "cd /workspace && ionic serve --host=0.0.0.0 --port=8100 --poll=1000 --no-open --no-interactive > /tmp/serve.log 2>&1"
# Esperar ~15 segundos
docker exec mediconnect-app sh -c "cat /tmp/serve.log"
# Abrir http://localhost:8100
```

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

### Ejecutar los tests

```bash
docker exec mediconnect-app sh -c "cd /workspace && npm run test:ci"
```

### Ver las tablas de la base de datos

```bash
docker exec mediconnect-postgres psql -U postgres -d mediconnect -c "\dt"
```

---

## Mantenimiento

### Detener los contenedores (sin perder datos)

```bash
docker compose down
```

### Reiniciar desde cero (borra datos de PostgreSQL y node_modules)

```bash
docker compose down -v
docker compose up -d --build
docker exec mediconnect-app sh -c "cd /workspace && npm install"
```

### Reconstruir la imagen Docker (cuando cambie el Dockerfile)

```bash
docker compose up -d --build
```

### Abrir una shell dentro del contenedor

```bash
docker exec -it mediconnect-app sh
```

### Abrir la consola de PostgreSQL

```bash
docker exec -it mediconnect-postgres psql -U postgres -d mediconnect
```

---

## Problemas comunes

### `ionic: The term 'ionic' is not recognized`

Estás ejecutando el comando en Windows. Ionic está dentro del contenedor Docker. Usar `docker exec mediconnect-app sh -c "..."`.

### La app no carga en `http://localhost:8100`

1. Verifica que el servidor está corriendo: `docker exec mediconnect-app sh -c "cat /tmp/serve.log"`.
2. Si el log dice `Local: http://localhost:8101`, hay otro servidor en el 8100. Mata todos y reinicia (paso 4).
3. Si no hay log, el servidor no se inició. Ejecutar el paso 5.

### El login dice "Credenciales incorrectas"

Usa exactamente los correos y contraseña de la tabla de credenciales. El correo no distingue mayúsculas.

### Cambié el SQL y no veo cambios en la base

PostgreSQL solo ejecuta los scripts de inicialización con el volumen vacío:

```bash
docker compose down -v
docker compose up -d --build
```

### VS Code marca errores rojos en los imports de Angular

Es normal. Los `node_modules` viven dentro del contenedor, no en tu máquina. El proyecto compila y funciona correctamente en Docker. Si quieres eliminar las marcas rojas para tener autocompletado:

```bash
cd app
npm install
```

---

## Estructura relevante

```
MediConnect/
├── Dockerfile                 # Imagen Docker: Node 24 + Ionic + Angular CLI + Chromium
├── docker-compose.yml         # Orquesta mediconnect-app y mediconnect-postgres
├── database/
│   └── 01_init.sql            # Tablas, triggers, índices y datos semilla
└── app/                       # Código fuente del frontend (montado en /workspace)
    ├── package.json           # Dependencias: Angular 21, Ionic 8, Capacitor 8
    ├── karma.conf.js          # Configuración de tests con Chromium headless
    ├── .browserslistrc        # Navegadores soportados
    └── src/
        ├── environments/      # Configuración de entorno (apiUrl, dbHost)
        └── app/
            ├── app.config.ts  # Providers: router, HTTP, Ionic standalone
            ├── app.routes.ts  # Rutas: auth/login, dashboard (protegido)
            ├── core/          # Guards, interceptors, services, models
            └── features/      # Login, register, dashboard
```

---

## Documentos complementarios

- [README.md](../README.md) — Visión general del proyecto
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Arquitectura y decisiones técnicas
- [API_CONTRACT.md](./API_CONTRACT.md) — Contrato de APIs para el backend futuro
- [BACKEND_PLAN.md](./BACKEND_PLAN.md) — Plan de implementación del backend
- [DEV_MODE.md](./DEV_MODE.md) — Detalles del modo de desarrollo actual
