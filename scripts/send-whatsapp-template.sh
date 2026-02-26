#!/bin/bash
# Envía un mensaje de plantilla por WhatsApp para abrir la conversación.
# NOTA: hello_world solo funciona con números de PRUEBA. Con número de producción
# crea una plantilla en Meta (ej. "bienvenida") y úsala: $0 573044696202 bienvenida
# Uso: ./scripts/send-whatsapp-template.sh <numero_sin_+> [nombre_plantilla]

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../backend/.env"

TO_NUMBER="${1:-}"
TEMPLATE="${2:-hello_world}"

if [ -z "$TO_NUMBER" ]; then
  echo "Uso: $0 <numero_sin_+> [nombre_plantilla]"
  echo "Ejemplo: $0 573044696202 hello_world"
  exit 1
fi

# Quitar + y espacios del número
TO_NUMBER=$(echo "$TO_NUMBER" | tr -d '+ ')

[ -z "$WHATSAPP_ACCESS_TOKEN" ] && [ -f "$ENV_FILE" ] && \
  WHATSAPP_ACCESS_TOKEN=$(grep '^WHATSAPP_ACCESS_TOKEN=' "$ENV_FILE" | head -1 | sed 's/^WHATSAPP_ACCESS_TOKEN=//; s/^["'\'']//; s/["'\'']$//; s/\r$//' | tr -d '\r')
[ -z "$WHATSAPP_PHONE_NUMBER_ID" ] && [ -f "$ENV_FILE" ] && \
  WHATSAPP_PHONE_NUMBER_ID=$(grep '^WHATSAPP_PHONE_NUMBER_ID=' "$ENV_FILE" | head -1 | sed 's/^WHATSAPP_PHONE_NUMBER_ID=//; s/^["'\'']//; s/["'\'']$//; s/\r$//' | tr -d '\r')

if [ -z "$WHATSAPP_ACCESS_TOKEN" ] || [ -z "$WHATSAPP_PHONE_NUMBER_ID" ]; then
  echo "Error: WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID deben estar en backend/.env"
  exit 1
fi

echo "Enviando plantilla '$TEMPLATE' a +$TO_NUMBER..."
curl -s -X POST "https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages" \
  -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"messaging_product\": \"whatsapp\",
    \"to\": \"$TO_NUMBER\",
    \"type\": \"template\",
    \"template\": {
      \"name\": \"$TEMPLATE\",
      \"language\": { \"code\": \"en_US\" }
    }
  }" | python3 -m json.tool
