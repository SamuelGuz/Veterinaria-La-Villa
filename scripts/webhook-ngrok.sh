#!/bin/bash
# Expone el backend por ngrok para que Meta pueda llamar al webhook.
# Requiere: backend corriendo en PORT (por defecto 3000) y ngrok instalado.
#
# Uso:
#   1. En una terminal: cd backend && npm run dev
#   2. En otra: ./scripts/webhook-ngrok.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/../backend" && pwd)"
ENV_FILE="$BACKEND_DIR/.env"

PORT=3000
if [ -f "$ENV_FILE" ]; then
  P=$(grep '^PORT=' "$ENV_FILE" | head -1 | sed 's/^PORT=//; s/"//g; s/\r$//')
  [ -n "$P" ] && PORT="$P"
fi

if ! command -v ngrok >/dev/null 2>&1; then
  echo "❌ ngrok no está instalado."
  echo "   Instálalo: https://ngrok.com/download"
  echo "   O: snap install ngrok  /  brew install ngrok"
  exit 1
fi

echo "📱 Webhook local: http://localhost:$PORT/webhook/whatsapp"
echo "   Token de verificación (Meta): VETERINARIA_LA_VILLA_2024"
echo ""
echo "🔗 Iniciando ngrok en el puerto $PORT..."
echo "   Copia la URL HTTPS que aparezca abajo (NO uses una URL de ejemplo)."
echo "   En Meta pon: URL = esa_https_url/webhook/whatsapp"
echo "   Token = VETERINARIA_LA_VILLA_2024"
echo ""
echo "   Log de peticiones: ver en http://127.0.0.1:4040 (inspección de ngrok)"
echo ""
# Guardar log en proyecto para revisar peticiones de Meta
LOG_DIR="$SCRIPT_DIR/../.ngrok-logs"
mkdir -p "$LOG_DIR"
exec ngrok http "$PORT" --log=stdout 2>&1 | tee "$LOG_DIR/ngrok-$(date +%Y%m%d-%H%M).log"
