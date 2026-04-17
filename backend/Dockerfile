FROM node:24-alpine

WORKDIR /api

# Instala dependencias primero (capa cacheada)
COPY package.json ./
RUN npm install --omit=dev

EXPOSE 3000

# El código fuente se monta como volumen en docker-compose (dev)
CMD ["node", "--watch", "src/server.js"]
