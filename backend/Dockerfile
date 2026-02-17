# Backend Dockerfile
FROM node:18-slim AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Generar Prisma Client
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# Imagen de producción
FROM node:18-slim

WORKDIR /app

# Instalar dependencias del sistema necesarias para Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Instalar solo dependencias de producción
COPY package*.json ./
RUN npm ci --only=production

# Copiar archivos compilados y Prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Exponer puerto
EXPOSE 3001

# Comando para iniciar
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/app.js"]

