#!/bin/bash
# Suscribe la WABA al webhook de la app (callback_url + verify_token).
# Meta exige esto además de configurar el webhook en el panel.
# Uso: ./scripts/subscribe-waba-webhook.sh [URL_WEBHOOK]
# Ejemplo: ./scripts/subscribe-waba-webhook.sh https://93e0-191-110-220-226.ngrok-free.app/webhook/whatsapp

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../backend/.env"

WABA_ID="1856975665002533"
VERIFY_TOKEN="VETERINARIA_LA_VILLA_2024"
CALLBACK_URL="${1:-}"

[ -z "$WHATSAPP_ACCESS_TOKEN" ] && [ -f "$ENV_FILE" ] && \
  WHATSAPP_ACCESS_TOKEN=$(grep '^WHATSAPP_ACCESS_TOKEN=' "$ENV_FILE" | head -1 | sed 's/^WHATSAPP_ACCESS_TOKEN=//; s/^["'\'']//; s/["'\'']$//; s/\r$//' | tr -d '\r')

if [ -z "$WHATSAPP_ACCESS_TOKEN" ]; then
  echo "Error: WHATSAPP_ACCESS_TOKEN no definido (backend/.env)"
  exit 1
fi

if [ -z "$CALLBACK_URL" ]; then
  echo "Uso: $0 <URL_WEBHOOK_HTTPS>"
  echo "Ejemplo: $0 https://xxxx.ngrok-free.app/webhook/whatsapp"
  exit 1
fi

echo "Suscribiendo WABA $WABA_ID al webhook..."
echo "  URL: $CALLBACK_URL"
echo "  Token: $VERIFY_TOKEN"
echo ""

curl -s -X POST "https://graph.facebook.com/v18.0/${WABA_ID}/subscribed_apps" \
  -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"callback_url\": \"$CALLBACK_URL\",
    \"verify_token\": \"$VERIFY_TOKEN\"
  }" | python3 -m json.tool

echo ""
echo "Si ves success: true, la WABA quedó suscrita al webhook."
