#!/bin/bash

# Script para desplegar el proyecto en EC2
# Uso: ./deploy-to-ec2.sh <IP_PUBLICA>

PEM_FILE="$HOME/.ssh/veterinaria-la-villa.pem"

if [ -z "$1" ]; then
    echo "❌ Error: Debes proporcionar la IP pública de la instancia EC2"
    echo ""
    echo "Uso: $0 <IP_PUBLICA>"
    exit 1
fi

EC2_IP="$1"

# Detectar el usuario de EC2 (ec2-user o ubuntu)
echo "🔍 Detectando usuario de EC2..."
if ssh -i "$PEM_FILE" -o ConnectTimeout=5 -o StrictHostKeyChecking=no ec2-user@"$EC2_IP" "echo 'ec2-user'" 2>/dev/null; then
    EC2_USER="ec2-user"
elif ssh -i "$PEM_FILE" -o ConnectTimeout=5 -o StrictHostKeyChecking=no ubuntu@"$EC2_IP" "echo 'ubuntu'" 2>/dev/null; then
    EC2_USER="ubuntu"
else
    echo "❌ No se pudo conectar a la instancia"
    exit 1
fi

echo "✅ Usuario detectado: $EC2_USER"
echo ""

# Subir el proyecto
echo "📤 Subiendo proyecto a EC2..."
rsync -avz --progress \
    -e "ssh -i $PEM_FILE -o StrictHostKeyChecking=no" \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '.env' \
    --exclude '*.log' \
    ./ "$EC2_USER@$EC2_IP:~/Veterinaria-La-Villa/"

if [ $? -ne 0 ]; then
    echo "⚠️  rsync no está disponible, usando scp..."
    scp -i "$PEM_FILE" -r \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='dist' \
        --exclude='.env' \
        ./ "$EC2_USER@$EC2_IP:~/Veterinaria-La-Villa/"
fi

echo ""
echo "✅ Proyecto subido"
echo ""

# Ejecutar despliegue en EC2
echo "🚀 Ejecutando despliegue en EC2..."
ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" << 'ENDSSH'
cd ~/Veterinaria-La-Villa

# Instalar Docker si no está instalado
if ! command -v docker &> /dev/null; then
    echo "📦 Instalando Docker..."
    sudo yum update -y
    sudo yum install docker -y
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
fi

# Instalar Docker Compose si no está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Instalando Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Configurar variables de entorno si no existe
if [ ! -f .env.production ]; then
    echo "⚙️  Creando archivo .env.production..."
    cp env.production.example .env.production
    echo "⚠️  IMPORTANTE: Edita .env.production con tus valores antes de continuar"
fi

# Construir y levantar contenedores
echo "🐳 Construyendo y levantando contenedores..."
docker-compose up -d --build

echo ""
echo "✅ Despliegue completado!"
echo ""
echo "📊 Ver estado: docker-compose ps"
echo "📋 Ver logs: docker-compose logs -f"
ENDSSH

echo ""
echo "✅ Despliegue completado en EC2!"
echo ""
echo "🌐 Accede a tu aplicación en: http://$EC2_IP"

