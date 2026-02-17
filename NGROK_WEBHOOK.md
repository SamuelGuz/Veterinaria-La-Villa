# 🔗 Configuración de Webhook WhatsApp con Ngrok

## ✅ Ngrok Configurado

Ngrok está corriendo y exponiendo tu servidor local.

## 📋 URL del Webhook para Meta Business Manager

**URL del Webhook:**
```
https://eb3e-191-110-242-246.ngrok-free.app/webhook/whatsapp
```

**Verify Token:**
```
VETERINARIA_LA_VILLA_2024
```

## 🔧 Pasos para Configurar en Meta Business Manager

1. **Ve a Meta Business Manager:**
   - https://business.facebook.com
   - Selecciona tu cuenta de negocio

2. **Navega a WhatsApp:**
   - Ve a **Configuración** → **WhatsApp** → **Configuración de API**

3. **Configura el Webhook:**
   - **URL de callback:** `https://eb3e-191-110-242-246.ngrok-free.app/webhook/whatsapp`
   - **Token de verificación:** `VETERINARIA_LA_VILLA_2024`
   - Haz clic en **Verificar y guardar**

4. **Suscríbete a eventos:**
   - Marca los eventos que quieres recibir:
     - ✅ `messages` (Mensajes)
     - ✅ `message_status` (Estado de mensajes)
     - ✅ `message_template_status_update` (Estado de plantillas)

## 🧪 Probar el Webhook

Una vez configurado, puedes probar enviando un mensaje al número:
- **Número:** +57 300 3847821
- El webhook debería recibir el mensaje y procesarlo

## 📝 Notas Importantes

- **Ngrok URL temporal:** Esta URL cambiará cada vez que reinicies ngrok (a menos que tengas cuenta de pago)
- **Para producción:** Usa un dominio propio con SSL
- **Verificación:** Meta enviará un GET request para verificar el webhook
- **Logs:** Revisa los logs del servidor para ver los webhooks recibidos

## 🔄 Comandos Útiles

**Ver logs de ngrok:**
```bash
tail -f /tmp/ngrok.log
```

**Ver interfaz web de ngrok:**
```
http://localhost:4040
```

**Reiniciar ngrok:**
```bash
pkill ngrok
ngrok http 3000
```

**Verificar que el webhook responde:**
```bash
curl "https://eb3e-191-110-242-246.ngrok-free.app/webhook/whatsapp/health"
```


