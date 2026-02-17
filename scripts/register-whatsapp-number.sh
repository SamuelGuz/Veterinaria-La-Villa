#!/bin/bash

# Script para registrar el número de WhatsApp
# Uso: ./register-whatsapp-number.sh <PIN_6_DIGITOS>

TOKEN="EAAcHoa1YgI4BQmnfLa36AztP0rZAHi8AjAhgpgmxw768W1z4UWxY5DBsr27IygENtqhH4yZCVm4cUBBZCWTMm4qqUPDcw4N9IfqVE1MRZBLBeziiUp4iVvfTYwiJPg86uOW48ChYQCV4A5Bj77czn8KYcZCUW6EZCjPUONhJkkSjWqT8yOwQVcJANyr6V9cQZDZD"
PHONE_NUMBER_ID="980758125122242"

if [ -z "$1" ]; then
    echo "❌ Error: Debes proporcionar el PIN de 6 dígitos"
    echo ""
    echo "Uso: $0 <PIN_6_DIGITOS>"
    echo ""
    echo "Ejemplo: $0 123456"
    exit 1
fi

PIN="$1"

# Validar que el PIN tenga 6 dígitos
if [[ ! "$PIN" =~ ^[0-9]{6}$ ]]; then
    echo "❌ Error: El PIN debe tener exactamente 6 dígitos numéricos"
    exit 1
fi

echo "🔄 Registrando número de WhatsApp..."
echo "📱 Phone Number ID: $PHONE_NUMBER_ID"
echo "🔑 PIN: ******"
echo ""

# Intentar con v23.0 primero
RESPONSE=$(curl -s -X POST "https://graph.facebook.com/v23.0/$PHONE_NUMBER_ID/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"messaging_product\": \"whatsapp\",
    \"pin\": \"$PIN\"
  }")

echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

# Verificar si fue exitoso
if echo "$RESPONSE" | grep -q '"success"\|"status"'; then
    echo ""
    echo "✅ ¡Registro exitoso!"
    echo ""
    echo "Verificando estado del número..."
    curl -s -X GET "https://graph.facebook.com/v18.0/$PHONE_NUMBER_ID?fields=id,verified_name,display_phone_number,status,code_verification_status" \
      -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
else
    echo ""
    echo "⚠️  Si el registro falló, verifica:"
    echo "   1. Que el PIN sea correcto (6 dígitos)"
    echo "   2. Que el número esté verificado en Meta Business Manager"
    echo "   3. Que la cuenta de WhatsApp Business esté aprobada"
fi

