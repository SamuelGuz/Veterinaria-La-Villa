---
name: Sistema Veterinaria Inventario
overview: Sistema completo de gestión de inventario para veterinaria con backend Node.js/TypeScript (Prisma + Express), frontend React/TypeScript (Shadcn/ui + Zustand), autenticación JWT, dashboard con estadísticas y gestión completa de productos, categorías, distribuidores y movimientos de inventario.
todos:
  - id: setup-backend
    content: "Configurar proyecto backend: estructura de carpetas, package.json, tsconfig.json, variables de entorno"
    status: pending
  - id: setup-database
    content: "Configurar PostgreSQL: crear base de datos, configurar DATABASE_URL, instalar Prisma Client"
    status: pending
  - id: setup-prisma
    content: "Configurar Prisma: schema.prisma completo con todos los modelos, relaciones, índices. Crear migración inicial"
    status: pending
  - id: setup-triggers
    content: "Crear triggers PostgreSQL: función para actualizar inventario_actual automáticamente, función para calcular total"
    status: pending
  - id: setup-seed
    content: "Crear script de seed: usuario admin, categorías básicas, datos de ejemplo"
    status: pending
  - id: backend-auth
    content: "Implementar autenticación backend: controllers, services, middleware JWT, validadores Zod"
    status: pending
  - id: backend-crud
    content: "Implementar CRUD completo: controladores y rutas para Productos, Categorías, Distribuidores, Movimientos"
    status: pending
  - id: backend-stats
    content: "Implementar servicios de estadísticas: convertir queries SQL a Prisma (stock bajo, top productos, márgenes, comparativas, rotación, valor inventario)"
    status: pending
  - id: setup-frontend
    content: "Configurar proyecto frontend: estructura, package.json, tsconfig.json, Tailwind con colores (blanco/verde), Shadcn/ui"
    status: pending
  - id: frontend-auth
    content: "Implementar autenticación frontend: store Zustand, páginas Login/Registro, ProtectedRoute, cliente API con interceptores"
    status: pending
  - id: frontend-layout
    content: "Crear layout principal: Header, Sidebar, navegación, routing con React Router"
    status: pending
  - id: frontend-dashboard
    content: "Implementar Dashboard: tarjetas de métricas, gráficas con Recharts (top productos, compras vs ventas, categorías)"
    status: pending
  - id: frontend-productos
    content: "Implementar página Productos: tabla con TanStack Table (filtros, sorting, paginación), formularios CRUD"
    status: pending
  - id: frontend-inventario
    content: "Implementar página Inventario: lista de productos con stock, filtros, formularios para movimientos (compra/venta/ajuste)"
    status: pending
  - id: frontend-movimientos
    content: "Implementar página Movimientos: tabla de historial con filtros por fecha, tipo, producto"
    status: pending
  - id: frontend-categorias-distribuidores
    content: "Implementar páginas Categorías y Distribuidores: CRUD completo con formularios"
    status: pending
---

# Sistema de Gestión de Inventario para Veterinaria

## Arquitectura General

El sistema estará dividido en dos aplicaciones principales:

- **Backend**: API REST con Node.js + TypeScript + Express + Prisma
- **Frontend**: Aplicación React + TypeScript + Shadcn/ui + Zustand

## Estructura del Proyecto

```
veterinaria-la-villa/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── validators/
│   │   └── app.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── lib/
│   │   ├── hooks/
│   │   └── App.tsx
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Backend - Implementación

### 1. Configuración Base

**Archivos principales:**

- `backend/package.json`: Dependencias (express, prisma, bcrypt, jsonwebtoken, zod, cors, dotenv)
- `backend/tsconfig.json`: Configuración TypeScript
- `backend/src/app.ts`: Configuración de Express con middlewares
- `backend/.env.example`: Variables de entorno (DATABASE_URL, JWT_SECRET, PORT)

### 2. Configuración de PostgreSQL

**Requisitos:**

- PostgreSQL 12+ instalado localmente o en servidor
- Base de datos creada: `veterinaria_la_villa`

**Archivos de configuración:**

- `backend/.env`: `DATABASE_URL="postgresql://usuario:password@localhost:5432/veterinaria_la_villa?schema=public"`
- `backend/.env.example`: Template con variables de entorno
- `backend/src/config/database.ts`: Configuración de conexión Prisma Client

**Scripts de base de datos:**

- `backend/prisma/migrations/`: Migraciones automáticas de Prisma
- `backend/prisma/seed.ts`: Script de seed con datos iniciales

### 3. Esquema de Base de Datos (Prisma)

**`backend/prisma/schema.prisma`**:

**Modelo `User`:**

- id (Int, @id, @default(autoincrement()))
- email (String, @unique)
- password (String) - hash con bcrypt
- nombre (String)
- rol (String, default: "USER") - "ADMIN", "USER"
- createdAt (DateTime, @default(now()))
- updatedAt (DateTime, @updatedAt)
- movimientos (MovimientoInventario[])

**Modelo `Categoria`:**

- id (Int, @id, @default(autoincrement()))
- nombre (String, @db.VarChar(100))
- descripcion (String?, @db.Text)
- productos (Producto[])

**Modelo `Distribuidor`:**

- id (Int, @id, @default(autoincrement()))
- nombre (String, @db.VarChar(200))
- contacto (String?, @db.VarChar(100))
- telefono (String?, @db.VarChar(20))
- email (String?, @db.VarChar(100))
- movimientos (MovimientoInventario[])

**Modelo `Producto`:**

- id (Int, @id, @default(autoincrement()))
- nombre (String, @db.VarChar(300))
- categoriaId (Int)
- categoria (Categoria, @relation)
- descripcion (String?, @db.Text)
- stockMinimo (Int, @default(0))
- unidadMedida (String?, @db.VarChar(50)) - "ml", "unidades", "kg", etc.
- createdAt (DateTime, @default(now()))
- updatedAt (DateTime, @updatedAt)
- movimientos (MovimientoInventario[])
- inventarioActual (InventarioActual?)

**Modelo `MovimientoInventario`:**

- id (Int, @id, @default(autoincrement()))
- productoId (Int)
- producto (Producto, @relation)
- tipoMovimiento (String, @db.VarChar(20)) - "COMPRA", "VENTA", "AJUSTE"
- cantidad (Int)
- precioUnitario (Decimal, @db.Decimal(12, 2))
- total (Decimal, @db.Decimal(12, 2)) - calculado: cantidad * precioUnitario
- distribuidorId (Int?, optional)
- distribuidor (Distribuidor?, @relation)
- factura (String?, @db.VarChar(100))
- fecha (DateTime, @default(now()))
- usuarioId (Int?, optional)
- usuario (User?, @relation)
- notas (String?, @db.Text)
- @@index([fecha(sort: Desc)])
- @@index([productoId])

**Modelo `InventarioActual`:**

- productoId (Int, @id)
- producto (Producto, @relation(fields: [productoId], references: [id], onDelete: Cascade))
- cantidadActual (Int, @default(0))
- ultimaActualizacion (DateTime, @default(now()), @updatedAt)

**Índices adicionales (en migración SQL):**

- `CREATE INDEX idx_productos_categoria ON productos(categoria_id);`
- `CREATE INDEX idx_movimientos_fecha ON movimientos_inventario(fecha DESC);`
- `CREATE INDEX idx_movimientos_producto ON movimientos_inventario(producto_id);`

**Nota sobre campo `total` calculado:**

- En Prisma, el campo `total` se calculará en el servicio/controlador
- Alternativa: usar trigger PostgreSQL para calcular automáticamente (ver sección de triggers)

### 4. Triggers y Funciones PostgreSQL

**`backend/prisma/migrations/add_triggers.sql`** (migración manual):

**Trigger para actualizar inventario_actual automáticamente:**

```sql
CREATE OR REPLACE FUNCTION actualizar_inventario_actual()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tipo_movimiento = 'COMPRA' OR NEW.tipo_movimiento = 'AJUSTE' THEN
        INSERT INTO inventario_actual (producto_id, cantidad_actual, ultima_actualizacion)
        VALUES (NEW.producto_id, NEW.cantidad, NOW())
        ON CONFLICT (producto_id) 
        DO UPDATE SET 
            cantidad_actual = inventario_actual.cantidad_actual + NEW.cantidad,
            ultima_actualizacion = NOW();
    ELSIF NEW.tipo_movimiento = 'VENTA' THEN
        UPDATE inventario_actual
        SET cantidad_actual = cantidad_actual - NEW.cantidad,
            ultima_actualizacion = NOW()
        WHERE producto_id = NEW.producto_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_inventario
AFTER INSERT ON movimientos_inventario
FOR EACH ROW
EXECUTE FUNCTION actualizar_inventario_actual();
```

**Función para calcular total (alternativa a cálculo en aplicación):**

```sql
CREATE OR REPLACE FUNCTION calcular_total_movimiento()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total = NEW.cantidad * NEW.precio_unitario;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_total
BEFORE INSERT OR UPDATE ON movimientos_inventario
FOR EACH ROW
EXECUTE FUNCTION calcular_total_movimiento();
```

### 5. Queries SQL de Estadísticas

**`backend/src/services/estadisticas.service.ts`** implementará estos queries usando Prisma:

**1. Productos con stock bajo:**

```typescript
// Equivalente a:
// SELECT p.nombre, ia.cantidad_actual, p.stock_minimo
// FROM productos p
// JOIN inventario_actual ia ON p.id = ia.producto_id
// WHERE ia.cantidad_actual <= p.stock_minimo;
```

**2. Top productos vendidos (últimos 30 días):**

```typescript
// SELECT p.nombre, SUM(m.cantidad) as total_vendido, 
//        SUM(m.total) as ingresos
// FROM movimientos_inventario m
// JOIN productos p ON m.producto_id = p.id
// WHERE m.tipo_movimiento = 'VENTA' 
//   AND m.fecha >= NOW() - INTERVAL '30 days'
// GROUP BY p.id, p.nombre
// ORDER BY total_vendido DESC
// LIMIT 10;
```

**3. Margen de ganancia por producto:**

```typescript
// WITH compras AS (
//   SELECT producto_id, AVG(precio_unitario) as precio_compra
//   FROM movimientos_inventario
//   WHERE tipo_movimiento = 'COMPRA'
//   GROUP BY producto_id
// ),
// ventas AS (
//   SELECT producto_id, AVG(precio_unitario) as precio_venta
//   FROM movimientos_inventario
//   WHERE tipo_movimiento = 'VENTA'
//   GROUP BY producto_id
// )
// SELECT p.nombre, 
//        c.precio_compra, 
//        v.precio_venta,
//        (v.precio_venta - c.precio_compra) as margen_bruto,
//        ROUND(((v.precio_venta - c.precio_compra) / c.precio_compra * 100), 2) as margen_porcentaje
// FROM productos p
// JOIN compras c ON p.id = c.producto_id
// JOIN ventas v ON p.id = v.producto_id;
```

**4. Comparativa compras vs ventas mensual:**

```typescript
// Agrupar movimientos por mes y tipo, sumar totales
```

**5. Valor total del inventario actual:**

```typescript
// Sumar (cantidad_actual * último_precio_compra) de todos los productos
```

**6. Rotación de inventario:**

```typescript
// Calcular frecuencia de movimientos por producto
// Identificar productos de movimiento rápido vs lento
```

**7. Distribuidores más utilizados:**

```typescript
// Contar movimientos por distribuidor
// Calcular monto total por distribuidor
```

### 6. Script de Seed (Datos Iniciales)

**`backend/prisma/seed.ts`**:

- **Usuario administrador por defecto:**
  - Email: admin@veterinaria.com
  - Password: (hash con bcrypt)
  - Rol: ADMIN

- **Categorías básicas:**
  - Medicamentos
  - Alimentos
  - Accesorios
  - Higiene
  - Vacunas
  - Suplementos

- **Distribuidores de ejemplo (opcional):**
  - 2-3 distribuidores de prueba

**Comando:** `npx prisma db seed` (configurar en package.json)

### 7. Migraciones de Prisma

**Proceso:**

1. Crear migración inicial: `npx prisma migrate dev --name init`
2. Aplicar migraciones: `npx prisma migrate deploy` (producción)
3. Generar Prisma Client: `npx prisma generate`
4. Ver datos: `npx prisma studio`

**Archivos generados:**

- `backend/prisma/migrations/`: Historial de migraciones
- `backend/node_modules/.prisma/client/`: Cliente generado

### 4. Autenticación

**Archivos:**

- `backend/src/middleware/auth.ts`: Middleware JWT para proteger rutas
- `backend/src/controllers/auth.controller.ts`: Login, registro, obtener usuario actual
- `backend/src/routes/auth.routes.ts`: Rutas de autenticación
- `backend/src/services/auth.service.ts`: Lógica de autenticación (hash passwords, generar tokens)

### 5. Controladores y Servicios

**Productos:**

- `backend/src/controllers/producto.controller.ts`: CRUD completo
- `backend/src/services/producto.service.ts`: Lógica de negocio
- `backend/src/routes/producto.routes.ts`: Rutas REST

**Categorías:**

- `backend/src/controllers/categoria.controller.ts`
- `backend/src/routes/categoria.routes.ts`

**Distribuidores:**

- `backend/src/controllers/distribuidor.controller.ts`
- `backend/src/routes/distribuidor.routes.ts`

**Movimientos de Inventario:**

- `backend/src/controllers/movimiento.controller.ts`: Crear movimientos (COMPRA, VENTA, AJUSTE)
- `backend/src/services/movimiento.service.ts`: Actualizar inventario actual automáticamente
- `backend/src/routes/movimiento.routes.ts`

**Estadísticas:**

- `backend/src/controllers/estadisticas.controller.ts`: Endpoints para dashboard
  - Productos con stock bajo
  - Top productos vendidos
  - Margen de ganancia por producto
  - Comparativa compras vs ventas
  - Valor total del inventario
- `backend/src/services/estadisticas.service.ts`: Queries complejas con Prisma

### 6. Validación

**`backend/src/validators/`**: Schemas Zod para validar requests

- `auth.validator.ts`
- `producto.validator.ts`
- `movimiento.validator.ts`

## Frontend - Implementación

### 1. Configuración Base

**Archivos:**

- `frontend/package.json`: Dependencias (react, react-dom, typescript, shadcn/ui, zustand, react-router-dom, axios, recharts, tanstack-table)
- `frontend/tsconfig.json`: Configuración TypeScript
- `frontend/tailwind.config.js`: Configuración con colores (blanco primario, verde secundario)
- `frontend/src/lib/utils.ts`: Utilidades (cn helper para shadcn)

### 2. Tema y Estilos

**Colores principales:**

- Primario: Blanco (#FFFFFF) - fondos, tarjetas
- Secundario: Verde (#10B981 o similar) - botones, acentos, gráficas
- Configurar en `tailwind.config.js` y componentes de Shadcn/ui

### 3. Autenticación Frontend

**Archivos:**

- `frontend/src/store/auth.store.ts`: Store Zustand para estado de autenticación
- `frontend/src/pages/Login.tsx`: Página de login
- `frontend/src/components/auth/ProtectedRoute.tsx`: Componente para proteger rutas
- `frontend/src/lib/api.ts`: Cliente Axios con interceptores para tokens

### 4. Layout y Navegación

**Archivos:**

- `frontend/src/components/layout/Header.tsx`: Header con navegación
- `frontend/src/components/layout/Sidebar.tsx`: Sidebar con menú
- `frontend/src/components/layout/Layout.tsx`: Layout principal

### 5. Páginas Principales

**Dashboard (`frontend/src/pages/Dashboard.tsx`):**

- Tarjetas con métricas clave (valor inventario, productos stock bajo, etc.)
- Gráficas con Recharts:
  - Top 10 productos vendidos (bar chart)
  - Comparativa compras vs ventas mensual (line chart)
  - Distribución por categorías (pie chart)

**Productos (`frontend/src/pages/Productos.tsx`):**

- Tabla con TanStack Table (filtros, sorting, paginación)
- Modal/formulario para crear/editar productos
- Indicador visual de stock bajo

**Inventario (`frontend/src/pages/Inventario.tsx`):**

- Lista de productos con stock actual
- Filtros por categoría, stock bajo
- Acciones: registrar compra, venta, ajuste

**Movimientos (`frontend/src/pages/Movimientos.tsx`):**

- Tabla de movimientos con filtros por fecha, tipo, producto
- Detalles de cada movimiento

**Categorías (`frontend/src/pages/Categorias.tsx`):**

- CRUD de categorías

**Distribuidores (`frontend/src/pages/Distribuidores.tsx`):**

- CRUD de distribuidores

### 6. Componentes Reusables

**`frontend/src/components/ui/`**: Componentes de Shadcn/ui

- Button, Card, Table, Input, Select, Dialog, etc.

**Componentes custom:**

- `frontend/src/components/StockAlert.tsx`: Alerta de stock bajo
- `frontend/src/components/ProductCard.tsx`: Tarjeta de producto
- `frontend/src/components/MovimientoForm.tsx`: Formulario para crear movimientos

### 7. Estado Global (Zustand)

**Stores:**

- `frontend/src/store/auth.store.ts`: Autenticación
- `frontend/src/store/producto.store.ts`: Productos (cache)
- `frontend/src/store/inventario.store.ts`: Estado de inventario

## Funcionalidades Clave

1. **Gestión de Inventario:**

   - Actualización automática de stock al registrar movimientos
   - Alertas de stock bajo
   - Historial completo de movimientos

2. **Dashboard Analítico:**

   - Métricas en tiempo real
   - Gráficas interactivas
   - Exportación de reportes (futuro)

3. **Autenticación y Seguridad:**

   - Login/registro
   - Protección de rutas
   - Tokens JWT con refresh

4. **Validación:**

   - Validación en backend (Zod)
   - Validación en frontend (formularios)

## Configuración de Base de Datos - Resumen

- PostgreSQL 12+ como base de datos principal
- Prisma ORM para gestión de esquema y migraciones
- Triggers PostgreSQL para actualización automática de inventario
- Índices optimizados para queries de estadísticas
- Script de seed con datos iniciales (usuario admin, categorías)
- Queries complejas implementadas en servicios de estadísticas

## Scripts de Desarrollo

- Backend: `npm run dev` (nodemon + ts-node)
- Frontend: `npm run dev` (Vite o Create React App)
- Prisma: `npx prisma migrate dev`, `npx prisma studio`