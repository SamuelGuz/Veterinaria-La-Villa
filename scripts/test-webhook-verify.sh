#!/bin/bash
# Simula la verificación que hace Meta al webhook.
# Ejecutar con el backend corriendo (npm run dev en backend/).
# Uso: ./scripts/test-webhook-verify.sh [URL_BASE]
# Ejemplo: ./scripts/test-webhook-verify.sh
# Ejemplo con ngrok: ./scripts/test-webhook-verify.sh https://xxxx.ngrok-free.app

BASE="${1:-http://localhost:3000}"
URL="${BASE}/webhook/whatsapp"
TOKEN="VETERINARIA_LA_VILLA_2024"
CHALLENGE="test_challenge_$(date +%s)"

echo "GET $URL"
echo "  hub.mode=subscribe"
echo "  hub.verify_token=$TOKEN"
echo "  hub.challenge=$CHALLENGE"
echo ""

RESP=$(curl -s -w "\n%{http_code}" "$URL?hub.mode=subscribe&hub.verify_token=$TOKEN&hub.challenge=$CHALLENGE")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)

echo "HTTP $CODE"
echo "Body: $BODY"
echo ""

if [ "$CODE" = "200" ] && [ "$BODY" = "$CHALLENGE" ]; then
  echo "OK: El webhook responde como Meta lo necesita. Usa esta misma URL en Meta:"
  echo "  URL: ${BASE}/webhook/whatsapp"
  echo "  Token: $TOKEN"
  exit 0
else
  echo "FALLO: Meta espera HTTP 200 y body = '$CHALLENGE'. Revisa backend y token en .env."
  exit 1
fi
