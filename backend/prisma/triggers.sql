-- ============================================
-- TRIGGERS Y FUNCIONES PARA VETERINARIA LA VILLA
-- Ejecutar después de la migración inicial de Prisma
-- ============================================

-- ============================================
-- FUNCIÓN: Calcular total del movimiento automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION calcular_total_movimiento()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total = NEW.cantidad * NEW.precio_unitario;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular total antes de insertar o actualizar
DROP TRIGGER IF EXISTS trigger_calcular_total ON movimientos_inventario;
CREATE TRIGGER trigger_calcular_total
BEFORE INSERT OR UPDATE ON movimientos_inventario
FOR EACH ROW
EXECUTE FUNCTION calcular_total_movimiento();

-- ============================================
-- FUNCIÓN: Actualizar inventario_actual automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION actualizar_inventario_actual()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tipo_movimiento = 'COMPRA' THEN
        -- Para compras, sumar al inventario
        INSERT INTO inventario_actual (producto_id, cantidad_actual, ultima_actualizacion)
        VALUES (NEW.producto_id, NEW.cantidad, NOW())
        ON CONFLICT (producto_id) 
        DO UPDATE SET 
            cantidad_actual = inventario_actual.cantidad_actual + NEW.cantidad,
            ultima_actualizacion = NOW();
    ELSIF NEW.tipo_movimiento = 'VENTA' THEN
        -- Para ventas, restar del inventario
        UPDATE inventario_actual
        SET cantidad_actual = cantidad_actual - NEW.cantidad,
            ultima_actualizacion = NOW()
        WHERE producto_id = NEW.producto_id;
    ELSIF NEW.tipo_movimiento = 'AJUSTE' THEN
        -- Para ajustes, puede ser positivo o negativo
        INSERT INTO inventario_actual (producto_id, cantidad_actual, ultima_actualizacion)
        VALUES (NEW.producto_id, NEW.cantidad, NOW())
        ON CONFLICT (producto_id) 
        DO UPDATE SET 
            cantidad_actual = inventario_actual.cantidad_actual + NEW.cantidad,
            ultima_actualizacion = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar inventario después de insertar movimiento
DROP TRIGGER IF EXISTS trigger_actualizar_inventario ON movimientos_inventario;
CREATE TRIGGER trigger_actualizar_inventario
AFTER INSERT ON movimientos_inventario
FOR EACH ROW
EXECUTE FUNCTION actualizar_inventario_actual();

-- ============================================
-- FUNCIÓN: Verificar stock disponible antes de venta
-- ============================================
CREATE OR REPLACE FUNCTION verificar_stock_venta()
RETURNS TRIGGER AS $$
DECLARE
    stock_disponible INT;
BEGIN
    IF NEW.tipo_movimiento = 'VENTA' THEN
        SELECT cantidad_actual INTO stock_disponible
        FROM inventario_actual
        WHERE producto_id = NEW.producto_id;
        
        IF stock_disponible IS NULL OR stock_disponible < NEW.cantidad THEN
            RAISE EXCEPTION 'Stock insuficiente. Disponible: %, Solicitado: %', 
                COALESCE(stock_disponible, 0), NEW.cantidad;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para verificar stock antes de venta
DROP TRIGGER IF EXISTS trigger_verificar_stock ON movimientos_inventario;
CREATE TRIGGER trigger_verificar_stock
BEFORE INSERT ON movimientos_inventario
FOR EACH ROW
EXECUTE FUNCTION verificar_stock_venta();

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista: Productos con su stock actual
CREATE OR REPLACE VIEW vista_productos_stock AS
SELECT 
    p.id,
    p.nombre,
    c.nombre as categoria,
    p.unidad_medida,
    COALESCE(ia.cantidad_actual, 0) as stock_actual,
    p.stock_minimo,
    CASE 
        WHEN COALESCE(ia.cantidad_actual, 0) <= p.stock_minimo THEN true 
        ELSE false 
    END as stock_bajo,
    p.precio_compra,
    p.precio_venta,
    (p.precio_venta - p.precio_compra) as margen,
    p.activo
FROM productos p
LEFT JOIN inventario_actual ia ON p.id = ia.producto_id
LEFT JOIN categorias c ON p.categoria_id = c.id
WHERE p.activo = true
ORDER BY p.nombre;

-- Vista: Resumen de movimientos por producto
CREATE OR REPLACE VIEW vista_resumen_movimientos AS
SELECT 
    p.id as producto_id,
    p.nombre as producto,
    COUNT(CASE WHEN m.tipo_movimiento = 'COMPRA' THEN 1 END) as total_compras,
    COUNT(CASE WHEN m.tipo_movimiento = 'VENTA' THEN 1 END) as total_ventas,
    SUM(CASE WHEN m.tipo_movimiento = 'COMPRA' THEN m.cantidad ELSE 0 END) as unidades_compradas,
    SUM(CASE WHEN m.tipo_movimiento = 'VENTA' THEN m.cantidad ELSE 0 END) as unidades_vendidas,
    SUM(CASE WHEN m.tipo_movimiento = 'COMPRA' THEN m.total ELSE 0 END) as monto_compras,
    SUM(CASE WHEN m.tipo_movimiento = 'VENTA' THEN m.total ELSE 0 END) as monto_ventas
FROM productos p
LEFT JOIN movimientos_inventario m ON p.id = m.producto_id
GROUP BY p.id, p.nombre
ORDER BY monto_ventas DESC;

-- ============================================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ============================================
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha_tipo ON movimientos_inventario(fecha DESC, tipo_movimiento);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_inventario_stock_bajo ON inventario_actual(producto_id) 
WHERE cantidad_actual <= 0;
