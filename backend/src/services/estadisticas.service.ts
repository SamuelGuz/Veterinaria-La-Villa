import prisma from '../config/database';
import { Prisma } from '@prisma/client';

// ============================================
// SERVICIO DE ESTADÍSTICAS PARA DASHBOARD
// ============================================

// Productos con stock bajo
export const getProductosStockBajo = async () => {
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    include: {
      categoria: { select: { nombre: true } },
      inventarioActual: { select: { cantidadActual: true } },
    },
  });

  return productos
    .filter((p) => (p.inventarioActual?.cantidadActual || 0) <= p.stockMinimo)
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria.nombre,
      stockActual: p.inventarioActual?.cantidadActual || 0,
      stockMinimo: p.stockMinimo,
      diferencia: p.stockMinimo - (p.inventarioActual?.cantidadActual || 0),
    }))
    .sort((a, b) => b.diferencia - a.diferencia);
};

// Top productos vendidos (últimos 30 días)
export const getTopProductosVendidos = async (dias: number = 30, limit: number = 10) => {
  const fechaInicio = new Date();
  fechaInicio.setDate(fechaInicio.getDate() - dias);

  const ventas = await prisma.movimientoInventario.groupBy({
    by: ['productoId'],
    where: {
      tipoMovimiento: 'VENTA',
      fecha: { gte: fechaInicio },
    },
    _sum: {
      cantidad: true,
      total: true,
    },
    orderBy: {
      _sum: { cantidad: 'desc' },
    },
    take: limit,
  });

  // Obtener nombres de productos
  const productosIds = ventas.map((v) => v.productoId);
  const productos = await prisma.producto.findMany({
    where: { id: { in: productosIds } },
    select: { id: true, nombre: true },
  });

  const productosMap = new Map(productos.map((p) => [p.id, p.nombre]));

  return ventas.map((v) => ({
    productoId: v.productoId,
    nombre: productosMap.get(v.productoId) || 'Desconocido',
    totalVendido: v._sum.cantidad || 0,
    ingresos: Number(v._sum.total) || 0,
  }));
};

// Margen de ganancia por producto
export const getMargenesPorProducto = async () => {
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    select: {
      id: true,
      nombre: true,
      precioCompra: true,
      precioVenta: true,
      categoria: { select: { nombre: true } },
    },
  });

  return productos
    .filter((p) => p.precioCompra && p.precioVenta)
    .map((p) => {
      const precioCompra = Number(p.precioCompra) || 0;
      const precioVenta = Number(p.precioVenta) || 0;
      const margenBruto = precioVenta - precioCompra;
      const margenPorcentaje = precioCompra > 0 
        ? ((margenBruto / precioCompra) * 100).toFixed(2) 
        : '0';

      return {
        id: p.id,
        nombre: p.nombre,
        categoria: p.categoria.nombre,
        precioCompra,
        precioVenta,
        margenBruto,
        margenPorcentaje: parseFloat(margenPorcentaje),
      };
    })
    .sort((a, b) => b.margenPorcentaje - a.margenPorcentaje);
};

// Comparativa compras vs ventas mensual (últimos 12 meses)
export const getComparativaMensual = async () => {
  const fechaInicio = new Date();
  fechaInicio.setMonth(fechaInicio.getMonth() - 12);

  const movimientos = await prisma.movimientoInventario.findMany({
    where: {
      fecha: { gte: fechaInicio },
      tipoMovimiento: { in: ['COMPRA', 'VENTA'] },
    },
    select: {
      tipoMovimiento: true,
      total: true,
      fecha: true,
    },
  });

  // Agrupar por mes
  const meses: Record<string, { compras: number; ventas: number }> = {};

  movimientos.forEach((m) => {
    const fecha = new Date(m.fecha);
    const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;

    if (!meses[key]) {
      meses[key] = { compras: 0, ventas: 0 };
    }

    if (m.tipoMovimiento === 'COMPRA') {
      meses[key].compras += Number(m.total);
    } else {
      meses[key].ventas += Number(m.total);
    }
  });

  // Convertir a array ordenado
  return Object.entries(meses)
    .map(([mes, data]) => ({
      mes,
      compras: data.compras,
      ventas: data.ventas,
      diferencia: data.ventas - data.compras,
    }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
};

// Valor total del inventario actual
export const getValorInventario = async () => {
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    include: {
      inventarioActual: { select: { cantidadActual: true } },
    },
  });

  let valorTotal = 0;
  let valorPorCategoria: Record<number, { nombre: string; valor: number }> = {};

  const categorias = await prisma.categoria.findMany({
    select: { id: true, nombre: true },
  });
  const categoriasMap = new Map(categorias.map((c) => [c.id, c.nombre]));

  productos.forEach((p) => {
    const cantidad = p.inventarioActual?.cantidadActual || 0;
    const precioCompra = Number(p.precioCompra) || 0;
    const valor = cantidad * precioCompra;

    valorTotal += valor;

    if (!valorPorCategoria[p.categoriaId]) {
      valorPorCategoria[p.categoriaId] = {
        nombre: categoriasMap.get(p.categoriaId) || 'Sin categoría',
        valor: 0,
      };
    }
    valorPorCategoria[p.categoriaId].valor += valor;
  });

  return {
    valorTotal,
    porCategoria: Object.values(valorPorCategoria).sort((a, b) => b.valor - a.valor),
    totalProductos: productos.length,
    productosConStock: productos.filter((p) => (p.inventarioActual?.cantidadActual || 0) > 0).length,
  };
};

// Rotación de inventario
export const getRotacionInventario = async (dias: number = 30) => {
  const fechaInicio = new Date();
  fechaInicio.setDate(fechaInicio.getDate() - dias);

  const productos = await prisma.producto.findMany({
    where: { activo: true },
    include: {
      inventarioActual: { select: { cantidadActual: true } },
      movimientos: {
        where: {
          tipoMovimiento: 'VENTA',
          fecha: { gte: fechaInicio },
        },
        select: { cantidad: true },
      },
    },
  });

  return productos
    .map((p) => {
      const stockActual = p.inventarioActual?.cantidadActual || 0;
      const unidadesVendidas = p.movimientos.reduce((sum, m) => sum + m.cantidad, 0);
      const rotacion = stockActual > 0 ? (unidadesVendidas / stockActual) : 0;

      return {
        id: p.id,
        nombre: p.nombre,
        stockActual,
        unidadesVendidas,
        rotacion: parseFloat(rotacion.toFixed(2)),
        clasificacion: rotacion > 1 ? 'alta' : rotacion > 0.5 ? 'media' : 'baja',
      };
    })
    .sort((a, b) => b.rotacion - a.rotacion);
};

// Distribuidores más utilizados
export const getTopDistribuidores = async (limit: number = 10) => {
  const distribuidores = await prisma.distribuidor.findMany({
    where: { activo: true },
    include: {
      movimientos: {
        select: { total: true, cantidad: true },
      },
    },
  });

  return distribuidores
    .map((d) => ({
      id: d.id,
      nombre: d.nombre,
      contacto: d.contacto,
      telefono: d.telefono,
      totalMovimientos: d.movimientos.length,
      montoTotal: d.movimientos.reduce((sum, m) => sum + Number(m.total), 0),
      unidadesTotales: d.movimientos.reduce((sum, m) => sum + m.cantidad, 0),
    }))
    .sort((a, b) => b.montoTotal - a.montoTotal)
    .slice(0, limit);
};

// Resumen general del dashboard
export const getDashboardResumen = async () => {
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const hace30Dias = new Date();
  hace30Dias.setDate(hace30Dias.getDate() - 30);

  // Total de productos
  const totalProductos = await prisma.producto.count({ where: { activo: true } });

  // Productos con stock bajo
  const productosStockBajo = await getProductosStockBajo();

  // Valor del inventario
  const valorInventario = await getValorInventario();

  // Movimientos del mes
  const movimientosMes = await prisma.movimientoInventario.aggregate({
    where: { fecha: { gte: inicioMes } },
    _count: { id: true },
    _sum: { total: true },
  });

  // Ventas del mes
  const ventasMes = await prisma.movimientoInventario.aggregate({
    where: {
      tipoMovimiento: 'VENTA',
      fecha: { gte: inicioMes },
    },
    _count: { id: true },
    _sum: { total: true },
  });

  // Compras del mes
  const comprasMes = await prisma.movimientoInventario.aggregate({
    where: {
      tipoMovimiento: 'COMPRA',
      fecha: { gte: inicioMes },
    },
    _count: { id: true },
    _sum: { total: true },
  });

  // Categorías
  const totalCategorias = await prisma.categoria.count({ where: { activo: true } });

  // Distribuidores
  const totalDistribuidores = await prisma.distribuidor.count({ where: { activo: true } });

  return {
    productos: {
      total: totalProductos,
      stockBajo: productosStockBajo.length,
      conStock: valorInventario.productosConStock,
    },
    inventario: {
      valorTotal: valorInventario.valorTotal,
      porCategoria: valorInventario.porCategoria,
    },
    movimientosMes: {
      total: movimientosMes._count.id,
      monto: Number(movimientosMes._sum.total) || 0,
    },
    ventasMes: {
      total: ventasMes._count.id,
      monto: Number(ventasMes._sum.total) || 0,
    },
    comprasMes: {
      total: comprasMes._count.id,
      monto: Number(comprasMes._sum.total) || 0,
    },
    catalogos: {
      categorias: totalCategorias,
      distribuidores: totalDistribuidores,
    },
    alertas: {
      productosStockBajo: productosStockBajo.slice(0, 5),
    },
  };
};
