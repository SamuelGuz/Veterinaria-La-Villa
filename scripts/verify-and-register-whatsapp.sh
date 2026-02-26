#!/bin/bash
# Verifica el código y registra el número en WhatsApp Cloud API.
# Uso: WHATSAPP_ACCESS_TOKEN="tu_token" ./verify-and-register-whatsapp.sh 269338
# O pon WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID en backend/.env y ejecuta desde backend:
#   source .env 2>/dev/null; cd .. && ./scripts/verify-and-register-whatsapp.sh 269338

set -e
CODE="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/../backend" && pwd)"
ENV_FILE="$BACKEND_DIR/.env"

# Cargar .env si existe y no tenemos token (quitar comillas y \r)
if [ -z "$WHATSAPP_ACCESS_TOKEN" ] && [ -f "$ENV_FILE" ]; then
  WHATSAPP_ACCESS_TOKEN=$(grep '^WHATSAPP_ACCESS_TOKEN=' "$ENV_FILE" | head -1 | sed 's/^WHATSAPP_ACCESS_TOKEN=//; s/^["'\'']//; s/["'\'']$//; s/\r$//' | tr -d '\r')
  WHATSAPP_PHONE_NUMBER_ID=$(grep '^WHATSAPP_PHONE_NUMBER_ID=' "$ENV_FILE" | head -1 | sed 's/^WHATSAPP_PHONE_NUMBER_ID=//; s/^["'\'']//; s/["'\'']$//; s/\r$//' | tr -d '\r')
  export WHATSAPP_ACCESS_TOKEN WHATSAPP_PHONE_NUMBER_ID
fi

PHONE_ID="${WHATSAPP_PHONE_NUMBER_ID:-980758125122242}"

if [ -z "$CODE" ]; then
  echo "Uso: $0 <CODIGO_6_DIGITOS>"
  echo "Ejemplo: $0 269338"
  echo ""
  echo "O con token explícito: WHATSAPP_ACCESS_TOKEN=\"...\" $0 269338"
  exit 1
fi

if [ -z "$WHATSAPP_ACCESS_TOKEN" ]; then
  echo "Error: WHATSAPP_ACCESS_TOKEN no está definido."
  echo "Defínelo en backend/.env o: WHATSAPP_ACCESS_TOKEN=\"...\" $0 $CODE"
  exit 1
fi

if [[ ! "$CODE" =~ ^[0-9]{6}$ ]]; then
  echo "Error: El código debe tener 6 dígitos."
  exit 1
fi

echo "=== 1. Verificar código $CODE ==="
R1=$(curl -s -X POST "https://graph.facebook.com/v18.0/${PHONE_ID}/verify_code" \
  -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$CODE\"}")
echo "$R1" | python3 -m json.tool 2>/dev/null || echo "$R1"

if echo "$R1" | grep -q '"error"'; then
  echo ""
  echo "Verificación falló. Revisa el token y el Phone Number ID."
  exit 1
fi

echo ""
echo "=== 2. Registrar número con PIN $CODE ==="
R2=$(curl -s -X POST "https://graph.facebook.com/v18.0/${PHONE_ID}/register" \
  -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"messaging_product\":\"whatsapp\",\"pin\":\"$CODE\"}")
echo "$R2" | python3 -m json.tool 2>/dev/null || echo "$R2"

if echo "$R2" | grep -q '"error"'; then
  echo ""
  echo "Registro falló. Revisa el mensaje de error arriba."
  exit 1
fi

echo ""
echo "Listo. Número verificado y registrado."
