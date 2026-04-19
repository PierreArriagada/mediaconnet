# 03_seed_medicos_extra.sql

## Objetivo

Ampliar la base de datos de MediConnect agregando nuevos profesionales médicos, nuevas especialidades y bloques iniciales de disponibilidad.

## Contenido agregado

- 10 nuevas especialidades médicas
- 10 nuevos usuarios con rol Médico
- 10 nuevos registros en tabla `medicos`
- 30 bloques de disponibilidad médica

## Resultado esperado

Después de ejecutar el script:

- 15 médicos totales en el sistema
- 15 especialidades disponibles
- mayor cobertura para pruebas funcionales y demostraciones

## Seguridad

El script fue diseñado como **idempotente**, por lo tanto puede ejecutarse más de una vez sin duplicar información.

## Cómo ejecutar en entorno Docker

```bash

 Importante, comando solo valido en Mac

docker exec -i mediconnect-postgres psql -U postgres -d mediconnect < database/03_seed_medicos_extra.sql

comando valido en windows

inserta en el contenedor
docker cp database/03_seed_medicos_extra.sql mediconnect-postgres:/tmp/seed.sql

se ejecuta
docker exec -it mediconnect-postgres psql -U postgres -d mediconnect -f /tmp/seed.sql


Validaciones sugeridas

docker exec mediconnect-postgres psql -U postgres -d mediconnect -c "SELECT COUNT(*) FROM medicos;"
docker exec mediconnect-postgres psql -U postgres -d mediconnect -c "SELECT COUNT(*) FROM especialidades;"