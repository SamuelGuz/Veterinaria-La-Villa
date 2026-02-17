#!/bin/bash

# Script de despliegue para EC2
# Uso: ./deploy.sh

set -e

echo "🚀 Iniciando despliegue de Veterinaria La Villa..."

# Verificar que Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Instalando..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✅ Docker instalado. Por favor, cierra sesión y vuelve a entrar para aplicar los cambios de grupo."
    exit 0
fi

# Verificar que Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado. Instalando..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Verificar archivo .env
if [ ! -f .env.production ]; then
    echo "⚠️  Archivo .env.production no encontrado. Creando desde template..."
    if [ -f env.production.example ]; then
        cp env.production.example .env.production
        echo "📝 Por favor, edita .env.production con tus valores antes de continuar"
        echo "   Especialmente importante: JWT_SECRET y POSTGRES_PASSWORD"
        exit 1
    else
        echo "❌ No se encontró env.production.example"
        exit 1
    fi
fi

# Copiar .env.production a .env para docker-compose
cp .env.production .env

# Construir y levantar contenedores
echo "🔨 Construyendo imágenes Docker..."
docker-compose build --no-cache

echo "🚀 Iniciando contenedores..."
docker-compose up -d

echo "⏳ Esperando a que los servicios estén listos..."
sleep 15

# Verificar que los contenedores están corriendo
echo "📊 Estado de los contenedores:"
docker-compose ps

# Obtener IP pública
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "IP_PUBLICA_EC2")

echo ""
echo "✅ Despliegue completado!"
echo ""
echo "🌐 Frontend: http://${PUBLIC_IP}"
echo "🔧 Backend API: http://${PUBLIC_IP}:3001"
echo ""
echo "📝 Para ver los logs: docker-compose logs -f"
echo "📝 Para ver logs del backend: docker-compose logs -f backend"
echo "📝 Para ver logs del frontend: docker-compose logs -f frontend"
echo "🛑 Para detener: docker-compose down"
echo "🔄 Para reconstruir: docker-compose up -d --build"

