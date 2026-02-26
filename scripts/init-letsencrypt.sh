#!/bin/bash
# Script para obtener certificados SSL con Let's Encrypt
# Se ejecuta UNA VEZ en el EC2 después del primer deploy
# Uso: sudo ./init-letsencrypt.sh

set -e

DOMAIN="veterinariavilla.lat"
DOMAINS=("-d $DOMAIN -d www.$DOMAIN")
EMAIL="admin@$DOMAIN"  # Email para notificaciones de Let's Encrypt
STAGING=0  # Cambiar a 1 para modo test (evita rate limits de Let's Encrypt)

echo "=================================================="
echo "  Configurar SSL para $DOMAIN"
echo "=================================================="

# 1. Usar nginx.conf temporal (sin SSL) para poder obtener el certificado
echo ""
echo "📋 Paso 1: Configurar Nginx temporal (solo HTTP)..."
docker cp frontend/nginx.conf.pre-ssl veterinaria-frontend:/etc/nginx/conf.d/default.conf
docker exec veterinaria-frontend nginx -s reload
echo "✅ Nginx configurado en modo HTTP"

# Esperar un momento para que nginx esté listo
sleep 3

# 2. Obtener certificado con Certbot
echo ""
echo "📋 Paso 2: Obteniendo certificado SSL con Let's Encrypt..."

if [ $STAGING != "0" ]; then
    echo "⚠️  MODO STAGING (certificado de prueba)"
    STAGING_ARG="--staging"
else
    STAGING_ARG=""
fi

docker compose run --rm certbot certonly \
    --webroot \
    -w /var/www/certbot \
    ${DOMAINS[@]} \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    $STAGING_ARG

if [ $? -ne 0 ]; then
    echo "❌ Error obteniendo certificado. Verifica que:"
    echo "   - El dominio $DOMAIN apunta a esta IP"
    echo "   - Los puertos 80 y 443 están abiertos"
    echo "   - El DNS ya propagó (puede tardar hasta 1 hora)"
    exit 1
fi

echo "✅ Certificado SSL obtenido exitosamente"

# 3. Activar nginx.conf con SSL completo
echo ""
echo "📋 Paso 3: Activando configuración HTTPS completa..."
docker cp frontend/nginx.conf veterinaria-frontend:/etc/nginx/conf.d/default.conf
docker exec veterinaria-frontend nginx -s reload

echo "✅ HTTPS activado"

# 4. Configurar renovación automática con cron
echo ""
echo "📋 Paso 4: Configurando renovación automática..."

# Crear script de renovación
cat > /tmp/renew-ssl.sh << 'RENEW'
#!/bin/bash
cd /home/ubuntu/Veterinaria-La-Villa
docker compose run --rm certbot renew --quiet
docker exec veterinaria-frontend nginx -s reload
RENEW

sudo mv /tmp/renew-ssl.sh /usr/local/bin/renew-ssl.sh
sudo chmod +x /usr/local/bin/renew-ssl.sh

# Agregar cron job (renovar cada 60 días a las 3am)
(crontab -l 2>/dev/null | grep -v "renew-ssl"; echo "0 3 1 */2 * /usr/local/bin/renew-ssl.sh >> /var/log/ssl-renew.log 2>&1") | crontab -

echo "✅ Renovación automática configurada (cada 60 días)"

echo ""
echo "=================================================="
echo "  ✅ ¡SSL configurado exitosamente!"
echo "=================================================="
echo ""
echo "  🔒 https://$DOMAIN"
echo "  🔒 https://www.$DOMAIN → redirige a https://$DOMAIN"
echo "  🔓 http://$DOMAIN → redirige a https://$DOMAIN"
echo ""
echo "  El certificado se renueva automáticamente cada 60 días."
echo "=================================================="
