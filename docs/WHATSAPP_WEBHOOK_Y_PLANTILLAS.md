# Webhook, "Invitarlo a WhatsApp" y plantillas

## Por qué sale "Invitarlo a WhatsApp" aunque el número esté Conectado

En Meta el número aparece **Conectado**, pero al abrir el chat desde otro teléfono WhatsApp puede salir **"Invitarlo a WhatsApp"**. Eso es normal:

- **Conectado** = el número está registrado y la API puede enviar/recibir.
- **"Invitarlo a WhatsApp"** = esa conversación aún **no está abierta** desde el punto de vista de WhatsApp.

Para que un usuario pueda chatear contigo, la **empresa tiene que enviar el primer mensaje** (con una plantilla aprobada). Ese mensaje “abre” la conversación; después el usuario puede responder y tú ves los mensajes en el webhook.

## Flujo correcto

1. **Tú (desde la API)** envías un mensaje de **plantilla** al número del usuario (ej: 573044696202).
2. El usuario recibe el mensaje en WhatsApp y puede **responder**.
3. Esa respuesta la envía Meta a **tu webhook** (ngrok → backend). Ahí es cuando ves algo en ngrok.

Si nunca envías esa plantilla al usuario, la conversación no se abre y puede seguir saliendo “Invitarlo a WhatsApp”.

## Plantilla hello_world y números de producción

- **hello_world** solo está permitida para **números de prueba** (Public Test Numbers).
- Tu número **+57 300 3847821** es de **producción**, así que con ese número **no** puedes usar `hello_world`.

Tienes que usar **otra plantilla** que tengas creada y aprobada en Meta.

## Crear una plantilla para abrir conversaciones (producción)

1. Meta for Developers → tu app → **WhatsApp** → **Plantillas de mensaje** (o Message Templates).
2. Crear plantilla, por ejemplo:
   - **Nombre:** `bienvenida` (solo minúsculas y guiones).
   - **Categoría:** Utilidad (UTILITY).
   - **Idioma:** Español o en_US.
   - **Cuerpo:** por ejemplo:  
     `Hola, gracias por contactar a Vet la Villa. ¿En qué podemos ayudarte?`
3. Enviar a revisión y esperar aprobación.
4. Cuando esté **APROBADA**, envía con el script:

   ```bash
   ./scripts/send-whatsapp-template.sh 573044696202 bienvenida
   ```

(Sustituye `bienvenida` por el nombre exacto de tu plantilla.)

## Por qué no ves nada en ngrok

- **Verificar y guardar** hace que Meta envíe un **GET** a tu URL. Si la verificación va bien, la página suele **recargarse** y el webhook queda suscrito. No siempre verás un mensaje claro de “éxito”; si la página recarga sin error rojo, suele estar bien.
- En ngrok **solo** verás peticiones cuando:
  - Meta hace el GET de verificación (al dar “Verificar y guardar”).
  - Alguien **envía un mensaje al número de la veterinaria**; entonces Meta hace un **POST** a tu webhook con ese mensaje.

Si nadie ha escrito al número después de configurar el webhook, es normal no ver nada más en ngrok.

## Resumen

| Qué quieres | Qué hacer |
|-------------|-----------|
| Dejar de ver "Invitarlo a WhatsApp" | Enviar primero un mensaje de plantilla (aprobada) al usuario desde la API. |
| Ver tráfico en ngrok | Después de “Verificar y guardar”, que alguien envíe un mensaje al +57 300 3847821. |
| Usar plantilla con número de producción | Crear y aprobar una plantilla en Meta (ej. `bienvenida`) y usar `send-whatsapp-template.sh` con su nombre. |
