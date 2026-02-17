#!/bin/bash

# Script para conectarse a la instancia EC2
# Uso: ./connect-ec2.sh <IP_PUBLICA>

PEM_FILE="$HOME/.ssh/veterinaria-la-villa.pem"

if [ -z "$1" ]; then
    echo "❌ Error: Debes proporcionar la IP pública de la instancia EC2"
    echo ""
    echo "Uso: $0 <IP_PUBLICA>"
    echo ""
    echo "Ejemplo: $0 54.123.45.67"
    echo ""
    echo "💡 Puedes encontrar la IP pública en AWS Console → EC2 → Instances"
    exit 1
fi

EC2_IP="$1"

# Verificar que el archivo PEM existe
if [ ! -f "$PEM_FILE" ]; then
    echo "❌ Error: No se encontró el archivo PEM en $PEM_FILE"
    exit 1
fi

# Verificar permisos del PEM
if [ "$(stat -c %a "$PEM_FILE" 2>/dev/null || stat -f %A "$PEM_FILE" 2>/dev/null)" != "400" ]; then
    echo "🔧 Configurando permisos del archivo PEM..."
    chmod 400 "$PEM_FILE"
fi

echo "🔌 Conectando a EC2..."
echo "📱 IP: $EC2_IP"
echo "🔑 PEM: $PEM_FILE"
echo ""

# Intentar conectar (primero como ec2-user, luego como ubuntu)
echo "Intentando conectar como ec2-user..."
ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no ec2-user@"$EC2_IP" 2>&1 || {
    echo ""
    echo "Intentando conectar como ubuntu..."
    ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no ubuntu@"$EC2_IP" 2>&1 || {
        echo ""
        echo "❌ No se pudo conectar. Verifica:"
        echo "   1. Que la instancia esté corriendo"
        echo "   2. Que la IP pública sea correcta"
        echo "   3. Que el Security Group permita conexiones SSH (puerto 22) desde tu IP"
        exit 1
    }
}

