# 🚀 Guía de Despliegue en EC2

Esta guía te ayudará a desplegar Veterinaria La Villa en una instancia EC2 de AWS.

## 📋 Prerrequisitos

- Instancia EC2 (t3.micro o superior)
- Archivo `.pem` para conectarte a EC2
- Dominio propio (opcional pero recomendado)

## 🔧 Paso 1: Conectar a EC2

```bash
chmod 400 tu-archivo.pem
ssh -i tu-archivo.pem ec2-user@TU_IP_PUBLICA
```

## 📦 Paso 2: Instalar Docker y Docker Compose

```bash
# Actualizar sistema
sudo yum update -y

# Instalar Docker
sudo yum install docker -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalación
docker --version
docker-compose --version
```

**Nota:** Si acabas de agregar tu usuario al grupo docker, cierra sesión y vuelve a entrar.

## 📥 Paso 3: Subir el Proyecto

### Opción A: Clonar desde Git (recomendado)

```bash
# Instalar Git si no está instalado
sudo yum install git -y

# Clonar repositorio
git clone TU_REPOSITORIO_URL
cd Veterinaria-La-Villa
```

### Opción B: Subir archivos con SCP

```bash
# Desde tu máquina local
scp -i tu-archivo.pem -r Veterinaria-La-Villa ec2-user@TU_IP_PUBLICA:~/
```

## ⚙️ Paso 4: Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp env.production.example .env.production

# Editar con tus valores
nano .env.production
```

**Variables importantes a configurar:**

- `POSTGRES_PASSWORD`: Contraseña segura para PostgreSQL
- `JWT_SECRET`: Secreto para JWT (mínimo 32 caracteres, usa un generador)
- `CORS_ORIGIN`: URL de tu dominio (ej: `http://tudominio.com`)

**Generar JWT_SECRET seguro:**
```bash
openssl rand -base64 32
```

## 🚀 Paso 5: Desplegar

```bash
# Dar permisos de ejecución
chmod +x deploy.sh

# Ejecutar despliegue
./deploy.sh
```

El script:
1. Verificará que Docker esté instalado
2. Construirá las imágenes Docker
3. Iniciará los contenedores
4. Ejecutará las migraciones de Prisma

## 🔒 Paso 6: Configurar Security Groups en AWS

En la consola de AWS EC2, configura los Security Groups:

1. **Puerto 22 (SSH)**: Tu IP personal
2. **Puerto 80 (HTTP)**: `0.0.0.0/0` (público)
3. **Puerto 3001 (Backend API)**: Opcional, solo si necesitas acceso directo

## 🌐 Paso 7: Configurar Dominio (Opcional)

### 7.1 Obtener IP Elástica de EC2

En la consola de AWS:
1. Ve a EC2 → Elastic IPs
2. Asigna una IP elástica a tu instancia
3. Copia la IP pública

### 7.2 Configurar DNS

En tu proveedor de dominio, crea un registro **A** apuntando a la IP elástica:

```
Tipo: A
Nombre: @ (o www)
Valor: TU_IP_ELASTICA
TTL: 3600
```

### 7.3 Actualizar CORS_ORIGIN

```bash
# Editar .env.production
nano .env.production

# Cambiar CORS_ORIGIN a tu dominio
CORS_ORIGIN=https://tudominio.com

# Reiniciar contenedores
docker-compose restart backend
```

## 🔐 Paso 8: Configurar SSL con Let's Encrypt (Opcional pero recomendado)

```bash
# Instalar Certbot
sudo yum install certbot python3-certbot-nginx -y

# Obtener certificado
sudo certbot certonly --standalone -d tudominio.com -d www.tudominio.com

# Los certificados se guardan en:
# /etc/letsencrypt/live/tudominio.com/
```

Luego actualiza `nginx.conf` para usar HTTPS.

## 📊 Comandos Útiles

```bash
# Ver logs
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f frontend

# Reiniciar servicios
docker-compose restart

# Detener todo
docker-compose down

# Detener y eliminar volúmenes (¡CUIDADO! Borra la BD)
docker-compose down -v

# Reconstruir después de cambios
docker-compose up -d --build

# Entrar a un contenedor
docker exec -it veterinaria-backend sh
docker exec -it veterinaria-postgres psql -U postgres

# Ver estado de contenedores
docker-compose ps

# Ver uso de recursos
docker stats
```

## 🔄 Actualizar el Proyecto

```bash
# Si usas Git
git pull origin main

# Reconstruir y reiniciar
docker-compose up -d --build

# Ejecutar nuevas migraciones
docker-compose exec backend npx prisma migrate deploy
```

## 🐛 Solución de Problemas

### Los contenedores no inician

```bash
# Ver logs de error
docker-compose logs

# Verificar que el puerto 80 no esté en uso
sudo lsof -i :80

# Verificar espacio en disco
df -h
```

### Error de conexión a base de datos

```bash
# Verificar que PostgreSQL está corriendo
docker-compose ps postgres

# Ver logs de PostgreSQL
docker-compose logs postgres

# Verificar variables de entorno
docker-compose exec backend env | grep DATABASE
```

### Frontend no carga

```bash
# Verificar que Nginx está corriendo
docker-compose ps frontend

# Ver logs de Nginx
docker-compose logs frontend

# Verificar configuración de Nginx
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf
```

## 📞 Soporte

Si tienes problemas, revisa los logs:
```bash
docker-compose logs -f
```

