# 📱 Guía de Activación de Número WhatsApp Cloud API

Esta guía explica cómo activar un número de teléfono para usar con WhatsApp Business Cloud API.

## 📋 Requisitos Previos

1. **Meta Business Account** - Cuenta de negocio en Meta
2. **WhatsApp Business App** - Aplicación creada en Meta for Developers
3. **Access Token** - Token de acceso con permisos `whatsapp_business_management`
4. **Phone Number ID** - ID del número de teléfono (se obtiene desde Meta Business Manager)

## 🔑 Variables de Entorno

Configura las siguientes variables en tu archivo `.env` o `.env.production`:

```env
# Token de acceso de WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=tu_token_aqui

# Phone Number ID (se obtiene desde Meta Business Manager)
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id_aqui

# Webhook Verify Token (tú lo defines)
WHATSAPP_VERIFY_TOKEN=VETERINARIA_LA_VILLA_2024
```

## 🚀 Proceso de Activación

### Paso 1: Obtener Phone Number ID

1. Ve a [Meta Business Manager](https://business.facebook.com)
2. Selecciona tu cuenta de negocio
3. Ve a **Configuración** → **WhatsApp Business Platform**
4. Encuentra tu número de teléfono y copia el **Phone Number ID**

### Paso 2: Solicitar Código de Verificación

**Endpoint:** `POST /api/whatsapp/activation/request-code`

**Request Body:**
```json
{
  "phoneNumberId": "TU_PHONE_NUMBER_ID",
  "codeMethod": "SMS"
}
```

**Ejemplo con cURL:**
```bash
curl -X POST http://localhost:3001/api/whatsapp/activation/request-code \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumberId": "TU_PHONE_NUMBER_ID",
    "codeMethod": "SMS"
  }'
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Código de verificación enviado vía SMS",
  "code_length": 6,
  "code_method": "SMS"
}
```

**Nota:** El código se enviará por SMS o llamada de voz al número de teléfono asociado.

### Paso 3: Verificar el Código

Una vez recibas el código (por SMS o llamada), verifícalo usando:

**Endpoint:** `POST /api/whatsapp/activation/verify-code`

**Request Body:**
```json
{
  "phoneNumberId": "TU_PHONE_NUMBER_ID",
  "code": "123456"
}
```

**Ejemplo con cURL:**
```bash
curl -X POST http://localhost:3001/api/whatsapp/activation/verify-code \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumberId": "TU_PHONE_NUMBER_ID",
    "code": "123456"
  }'
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Número de teléfono verificado exitosamente",
  "phone_number_id": "TU_PHONE_NUMBER_ID",
  "status": "VERIFIED"
}
```

### Paso 4: Verificar Estado

Puedes consultar el estado del número en cualquier momento:

**Endpoint:** `GET /api/whatsapp/activation/status?phoneNumberId=TU_PHONE_NUMBER_ID`

**Ejemplo con cURL:**
```bash
curl http://localhost:3001/api/whatsapp/activation/status?phoneNumberId=TU_PHONE_NUMBER_ID
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "verified_name": "Veterinaria La Villa",
    "display_phone_number": "+573003847821",
    "quality_rating": "GREEN",
    "status": "CONNECTED",
    "code_verification_status": "VERIFIED"
  }
}
```

## 📊 Endpoints Disponibles

### 1. Información de Configuración
- **GET** `/api/whatsapp/activation/info`
- Muestra la configuración actual de WhatsApp

### 2. Solicitar Código
- **POST** `/api/whatsapp/activation/request-code`
- Solicita un código de verificación

### 3. Verificar Código
- **POST** `/api/whatsapp/activation/verify-code`
- Verifica el código recibido

### 4. Estado del Número
- **GET** `/api/whatsapp/activation/status?phoneNumberId=ID`
- Consulta el estado actual del número

## 🔧 Configuración para tu Número

Para el número **57 300 3847821**, asegúrate de:

1. **Formatear el número correctamente:**
   - Formato internacional: `573003847821` (sin espacios ni guiones)
   - O con código de país: `+573003847821`

2. **Configurar variables de entorno:**
   ```env
   WHATSAPP_ACCESS_TOKEN=EAAcHoa1YgI4BQtYu702ghs7Q23EJu2QV1hXZBPxnRKoGfhR7AZAuMkX8wRv5ZBBdHP7n3vR7wo08OL5U6OZCo0e7tV0riUiHatZBkm7FcMGlM25Q0OGFZCZCoiL52OVL2oBb7WZCdU8nSQ1LYDKKIFF2J5ZAAwD4FsZCR6dc6zpyODn5f57YwqTp6ZAc7MTGNRYM9riEPHVjgF4NJenkwAUqtn7GQtMpOtXAlUkbjdgk330oo3RgZAzoAqXp3IQ88xlWOi9DZBdTKXRy1tFONFXJ7AlLb
   WHATSAPP_PHONE_NUMBER_ID=TU_PHONE_NUMBER_ID_AQUI
   WHATSAPP_VERIFY_TOKEN=VETERINARIA_LA_VILLA_2024
   ```

3. **Obtener el Phone Number ID:**
   - El Phone Number ID es diferente al número de teléfono
   - Se obtiene desde Meta Business Manager
   - Generalmente es un ID numérico largo

## ⚠️ Errores Comunes

### Error: "Invalid OAuth access token"
- Verifica que el `WHATSAPP_ACCESS_TOKEN` sea válido y no haya expirado
- Asegúrate de que tenga los permisos necesarios

### Error: "Phone number not found"
- Verifica que el `phoneNumberId` sea correcto
- Asegúrate de que el número esté asociado a tu cuenta de negocio

### Error: "Code verification failed"
- El código puede haber expirado (generalmente válido por 10 minutos)
- Solicita un nuevo código
- Verifica que ingresaste el código correcto

### Error: "Session has expired" (código 190)
- El **token de acceso** ha caducado. Genera un **token permanente** en Meta:
  - Meta for Developers → Tu app → WhatsApp → Configuración de la API → Token permanente
- Actualiza `WHATSAPP_ACCESS_TOKEN` en `backend/.env` y en el servidor de producción.

### Error: "Object does not exist / missing permissions" (código 100, subcode 33)
- El token no tiene permisos sobre ese Phone Number ID, o el ID no existe.
- Confirma que el token es de la misma app que tiene el número y que tiene permisos `whatsapp_business_management` y `whatsapp_business_messaging`.

## 🛠️ Script: Verificar código y registrar número

Desde la raíz del proyecto, con `backend/.env` configurado (o pasando el token por variable de entorno):

```bash
./scripts/verify-and-register-whatsapp.sh 269338
```

Con token explícito:

```bash
WHATSAPP_ACCESS_TOKEN="tu_token_permanente" ./scripts/verify-and-register-whatsapp.sh 269338
```

El script hace en orden: **verify_code** con el código y luego **register** con el mismo código como PIN.

**Importante:** Usa un **token permanente** válido. Si el token expira, genera uno nuevo en Meta y actualiza `WHATSAPP_ACCESS_TOKEN`. La App Secret (`WHATSAPP_APP_SECRET`) está en el config por si Meta la pide en el futuro.

## 📚 Documentación Adicional

- [WhatsApp Cloud API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Phone Number Registration](https://developers.facebook.com/docs/whatsapp/cloud-api/phone-numbers)
- [Meta Business Manager](https://business.facebook.com)

## ✅ Checklist de Activación

- [ ] Meta Business Account creada
- [ ] WhatsApp Business App configurada
- [ ] Access Token obtenido con permisos correctos
- [ ] Phone Number ID obtenido desde Meta Business Manager
- [ ] Variables de entorno configuradas
- [ ] Código de verificación solicitado
- [ ] Código verificado exitosamente
- [ ] Estado del número verificado (status: CONNECTED)
- [ ] Webhook configurado en Meta Business Manager

## 🔗 Próximos Pasos

Una vez activado el número:

1. **Configurar Webhook:**
   - URL: `https://tu-dominio.com/webhook/whatsapp`
   - Verify Token: El mismo que configuraste en `WHATSAPP_VERIFY_TOKEN`

2. **Probar el Bot:**
   - Envía un mensaje de prueba al número
   - Verifica que el webhook reciba los mensajes

3. **Configurar Números Autorizados:**
   - Usa el endpoint `/api/numeros-autorizados` para agregar números permitidos

