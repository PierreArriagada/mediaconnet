# ─────────────────────────────────────────────────────────────
# Imagen base: Node.js 24 LTS en Alpine (ligera y segura)
# ─────────────────────────────────────────────────────────────
FROM node:24-alpine

# Instala dependencias del sistema necesarias para Capacitor, native builds y tests headless
RUN apk add --no-cache git python3 make g++ chromium

WORKDIR /workspace

# Instala CLIs globales de desarrollo
# @angular/cli@21.2.7 → alineado con Angular 21 del proyecto
# @ionic/cli@latest   → CLI global para desarrollo Ionic
# @capacitor/cli@8.3.1 → alineado con Capacitor 8 del proyecto
RUN npm install -g @angular/cli@21.2.7 @ionic/cli@latest @capacitor/cli@8.3.1

EXPOSE 8100 4200

CMD ["tail", "-f", "/dev/null"]
