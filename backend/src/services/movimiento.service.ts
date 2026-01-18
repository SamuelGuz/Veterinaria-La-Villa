import prisma from '../config/database';
import { CreateMovimientoInput, QueryMovimientosInput } from '../validators';
import { NotFoundError, BadRequestError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

// Obtener movimientos con paginación y filtros
export const getMovimientos = async (query: QueryMovimientosInput) => {
  const {
    page,
    limit,
    productoId,
    tipoMovimiento,
    distribuidorId,
    fechaInicio,
    fechaFin,
    orderBy,
    order,
  } = query;

  const skip = (page - 1) * limit;

  // Construir condiciones de filtro
  const where: Prisma.MovimientoInventarioWhereInput = {
    ...(productoId && { productoId }),
    ...(tipoMovimiento && { tipoMovimiento }),
    ...(distribuidorId && { distribuidorId }),
    ...(fechaInicio || fechaFin
      ? {
          fecha: {
            ...(fechaInicio && { gte: fechaInicio }),
            ...(fechaFin && { lte: fechaFin }),
          },
        }
      : {}),
  };

  const movimientos = await prisma.movimientoInventario.findMany({
    where,
    include: {
      producto: {
        select: { id: true, nombre: true, unidadMedida: true },
      },
      distribuidor: {
        select: { id: true, nombre: true },
      },
      usuario: {
        select: { id: true, nombre: true },
      },
    },
    orderBy: { [orderBy]: order },
    skip,
    take: limit,
  });

  const total = await prisma.movimientoInventario.count({ where });

  return {
    data: movimientos,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// Obtener movimiento por ID
export const getMovimientoById = async (id: number) => {
  const movimiento = await prisma.movimientoInventario.findUnique({
    where: { id },
    include: {
      producto: {
        select: { id: true, nombre: true, unidadMedida: true },
      },
      distribuidor: {
        select: { id: true, nombre: true },
      },
      usuario: {
        select: { id: true, nombre: true },
      },
    },
  });

  if (!movimiento) {
    throw new NotFoundError('Movimiento no encontrado');
  }

  return movimiento;
};

// Crear movimiento de inventario
export const createMovimiento = async (
  data: CreateMovimientoInput,
  usuarioId?: number
) => {
  // Verificar que el producto existe
  const producto = await prisma.producto.findUnique({
    where: { id: data.productoId },
    include: { inventarioActual: true },
  });

  if (!producto) {
    throw new NotFoundError('Producto no encontrado');
  }

  // Verificar distribuidor si se proporciona
  if (data.distribuidorId) {
    const distribuidor = await prisma.distribuidor.findUnique({
      where: { id: data.distribuidorId },
    });

    if (!distribuidor) {
      throw new NotFoundError('Distribuidor no encontrado');
    }
  }

  const stockActual = producto.inventarioActual?.cantidadActual || 0;

  // Validar stock para ventas
  if (data.tipoMovimiento === 'VENTA') {
    if (data.cantidad > stockActual) {
      throw new BadRequestError(
        `Stock insuficiente. Disponible: ${stockActual}, Solicitado: ${data.cantidad}`
      );
    }
  }

  // Calcular total
  const total = data.cantidad * data.precioUnitario;

  // Crear movimiento
  const movimiento = await prisma.movimientoInventario.create({
    data: {
      productoId: data.productoId,
      tipoMovimiento: data.tipoMovimiento,
      cantidad: data.cantidad,
      precioUnitario: data.precioUnitario,
      total,
      distribuidorId: data.distribuidorId,
      factura: data.factura,
      notas: data.notas,
      fecha: data.fecha || new Date(),
      usuarioId,
    },
    include: {
      producto: {
        select: { id: true, nombre: true },
      },
      distribuidor: {
        select: { id: true, nombre: true },
      },
    },
  });

  // Actualizar inventario actual
  let nuevoStock = stockActual;

  if (data.tipoMovimiento === 'COMPRA') {
    nuevoStock = stockActual + data.cantidad;
  } else if (data.tipoMovimiento === 'VENTA') {
    nuevoStock = stockActual - data.cantidad;
  } else if (data.tipoMovimiento === 'AJUSTE') {
    // El ajuste puede ser positivo o negativo
    nuevoStock = stockActual + data.cantidad;
  }

  // Upsert inventario actual
  await prisma.inventarioActual.upsert({
    where: { productoId: data.productoId },
    update: { cantidadActual: nuevoStock },
    create: { productoId: data.productoId, cantidadActual: nuevoStock },
  });

  return {
    ...movimiento,
    stockAnterior: stockActual,
    stockNuevo: nuevoStock,
  };
};

// Obtener movimientos por producto
export const getMovimientosByProducto = async (
  productoId: number,
  limit: number = 10
) => {
  const movimientos = await prisma.movimientoInventario.findMany({
    where: { productoId },
    include: {
      distribuidor: {
        select: { id: true, nombre: true },
      },
      usuario: {
        select: { id: true, nombre: true },
      },
    },
    orderBy: { fecha: 'desc' },
    take: limit,
  });

  return movimientos;
};

// Resumen de movimientos por periodo
export const getResumenMovimientos = async (
  fechaInicio: Date,
  fechaFin: Date
) => {
  const movimientos = await prisma.movimientoInventario.groupBy({
    by: ['tipoMovimiento'],
    where: {
      fecha: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    },
    _count: { id: true },
    _sum: { total: true, cantidad: true },
  });

  return movimientos.map((m) => ({
    tipo: m.tipoMovimiento,
    totalMovimientos: m._count.id,
    montoTotal: m._sum.total || 0,
    unidadesTotales: m._sum.cantidad || 0,
  }));
};
