#!/bin/bash

# Script para activar número de WhatsApp
# Uso: ./scripts/activate-whatsapp.sh

set -e

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Cargar variables de entorno
if [ -f .env.production ]; then
    source .env.production
elif [ -f .env ]; then
    source .env
else
    echo -e "${RED}❌ No se encontró archivo .env o .env.production${NC}"
    exit 1
fi

# Verificar variables necesarias
if [ -z "$WHATSAPP_ACCESS_TOKEN" ]; then
    echo -e "${RED}❌ WHATSAPP_ACCESS_TOKEN no está configurado${NC}"
    exit 1
fi

if [ -z "$WHATSAPP_PHONE_NUMBER_ID" ]; then
    echo -e "${YELLOW}⚠️  WHATSAPP_PHONE_NUMBER_ID no está configurado${NC}"
    read -p "Ingresa el Phone Number ID: " PHONE_NUMBER_ID
    WHATSAPP_PHONE_NUMBER_ID=$PHONE_NUMBER_ID
fi

# URL base de la API (ajustar según tu configuración)
API_URL="${API_URL:-http://localhost:3001}"

echo -e "${GREEN}🚀 Activación de Número WhatsApp${NC}"
echo -e "Phone Number ID: ${WHATSAPP_PHONE_NUMBER_ID}"
echo -e "API URL: ${API_URL}"
echo ""

# Paso 1: Solicitar código
echo -e "${YELLOW}📱 Paso 1: Solicitando código de verificación...${NC}"
read -p "¿Enviar código por SMS o VOICE? (SMS/VOICE) [SMS]: " CODE_METHOD
CODE_METHOD=${CODE_METHOD:-SMS}

RESPONSE=$(curl -s -X POST "${API_URL}/api/whatsapp/activation/request-code" \
  -H "Content-Type: application/json" \
  -d "{
    \"phoneNumberId\": \"${WHATSAPP_PHONE_NUMBER_ID}\",
    \"codeMethod\": \"${CODE_METHOD}\"
  }")

echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null || echo "false")

if [ "$SUCCESS" != "true" ]; then
    echo -e "${RED}❌ Error al solicitar código${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Código solicitado exitosamente${NC}"
echo ""

# Paso 2: Verificar código
echo -e "${YELLOW}🔐 Paso 2: Verificar código${NC}"
read -p "Ingresa el código recibido: " CODE

VERIFY_RESPONSE=$(curl -s -X POST "${API_URL}/api/whatsapp/activation/verify-code" \
  -H "Content-Type: application/json" \
  -d "{
    \"phoneNumberId\": \"${WHATSAPP_PHONE_NUMBER_ID}\",
    \"code\": \"${CODE}\"
  }")

echo "$VERIFY_RESPONSE" | jq '.' 2>/dev/null || echo "$VERIFY_RESPONSE"

VERIFY_SUCCESS=$(echo "$VERIFY_RESPONSE" | jq -r '.success' 2>/dev/null || echo "false")

if [ "$VERIFY_SUCCESS" = "true" ]; then
    echo -e "${GREEN}✅ Número verificado exitosamente!${NC}"
    echo ""
    
    # Paso 3: Verificar estado
    echo -e "${YELLOW}📊 Verificando estado del número...${NC}"
    STATUS_RESPONSE=$(curl -s "${API_URL}/api/whatsapp/activation/status?phoneNumberId=${WHATSAPP_PHONE_NUMBER_ID}")
    echo "$STATUS_RESPONSE" | jq '.' 2>/dev/null || echo "$STATUS_RESPONSE"
else
    echo -e "${RED}❌ Error al verificar código${NC}"
    exit 1
fi

