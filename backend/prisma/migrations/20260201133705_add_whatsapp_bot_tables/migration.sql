-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribuidores" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "contacto" VARCHAR(100),
    "telefono" VARCHAR(20),
    "email" VARCHAR(100),
    "direccion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distribuidores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(300) NOT NULL,
    "descripcion" TEXT,
    "categoria_id" INTEGER NOT NULL,
    "stock_minimo" INTEGER NOT NULL DEFAULT 0,
    "unidad_medida" VARCHAR(50) DEFAULT 'unidades',
    "precio_compra" DECIMAL(12,2) DEFAULT 0,
    "precio_venta" DECIMAL(12,2) DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "tipo_movimiento" VARCHAR(20) NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "distribuidor_id" INTEGER,
    "factura" VARCHAR(100),
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_id" INTEGER,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventario_actual" (
    "producto_id" INTEGER NOT NULL,
    "cantidad_actual" INTEGER NOT NULL DEFAULT 0,
    "ultima_actualizacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventario_actual_pkey" PRIMARY KEY ("producto_id")
);

-- CreateTable
CREATE TABLE "numeros_autorizados" (
    "id" SERIAL NOT NULL,
    "telefono" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "numeros_autorizados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes_procesados" (
    "id" SERIAL NOT NULL,
    "message_id" VARCHAR(100) NOT NULL,
    "telefono" VARCHAR(20) NOT NULL,
    "hash_mensaje" VARCHAR(64) NOT NULL,
    "resultado" TEXT NOT NULL,
    "procesado_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_procesados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "confirmaciones_pendientes" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(10) NOT NULL,
    "telefono" VARCHAR(20) NOT NULL,
    "tipo_operacion" VARCHAR(20) NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "distribuidor_id" INTEGER,
    "notas" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "confirmaciones_pendientes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_productos_categoria" ON "productos"("categoria_id");

-- CreateIndex
CREATE INDEX "idx_movimientos_fecha" ON "movimientos_inventario"("fecha" DESC);

-- CreateIndex
CREATE INDEX "idx_movimientos_producto" ON "movimientos_inventario"("producto_id");

-- CreateIndex
CREATE INDEX "idx_movimientos_tipo" ON "movimientos_inventario"("tipo_movimiento");

-- CreateIndex
CREATE UNIQUE INDEX "numeros_autorizados_telefono_key" ON "numeros_autorizados"("telefono");

-- CreateIndex
CREATE UNIQUE INDEX "mensajes_procesados_message_id_key" ON "mensajes_procesados"("message_id");

-- CreateIndex
CREATE INDEX "idx_mensajes_telefono" ON "mensajes_procesados"("telefono");

-- CreateIndex
CREATE INDEX "idx_mensajes_fecha" ON "mensajes_procesados"("procesado_at");

-- CreateIndex
CREATE UNIQUE INDEX "confirmaciones_pendientes_token_key" ON "confirmaciones_pendientes"("token");

-- CreateIndex
CREATE INDEX "idx_confirmaciones_telefono" ON "confirmaciones_pendientes"("telefono");

-- CreateIndex
CREATE INDEX "idx_confirmaciones_expiracion" ON "confirmaciones_pendientes"("expires_at");

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_distribuidor_id_fkey" FOREIGN KEY ("distribuidor_id") REFERENCES "distribuidores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_actual" ADD CONSTRAINT "inventario_actual_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes_procesados" ADD CONSTRAINT "mensajes_procesados_telefono_fkey" FOREIGN KEY ("telefono") REFERENCES "numeros_autorizados"("telefono") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confirmaciones_pendientes" ADD CONSTRAINT "confirmaciones_pendientes_telefono_fkey" FOREIGN KEY ("telefono") REFERENCES "numeros_autorizados"("telefono") ON DELETE RESTRICT ON UPDATE CASCADE;
