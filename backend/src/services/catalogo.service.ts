import prisma from '../config/database';
import {
  CreateCategoriaInput,
  UpdateCategoriaInput,
  CreateDistribuidorInput,
  UpdateDistribuidorInput,
} from '../validators';
import { NotFoundError, ConflictError } from '../middleware/errorHandler';

// ============================================
// SERVICIOS DE CATEGORÍA
// ============================================

// Obtener todas las categorías
export const getCategorias = async (includeInactive: boolean = false) => {
  const categorias = await prisma.categoria.findMany({
    where: includeInactive ? {} : { activo: true },
    include: {
      _count: {
        select: { productos: true },
      },
    },
    orderBy: { nombre: 'asc' },
  });

  return categorias.map((cat) => ({
    ...cat,
    totalProductos: cat._count.productos,
  }));
};

// Obtener categoría por ID
export const getCategoriaById = async (id: number) => {
  const categoria = await prisma.categoria.findUnique({
    where: { id },
    include: {
      _count: {
        select: { productos: true },
      },
    },
  });

  if (!categoria) {
    throw new NotFoundError('Categoría no encontrada');
  }

  return {
    ...categoria,
    totalProductos: categoria._count.productos,
  };
};

// Crear categoría
export const createCategoria = async (data: CreateCategoriaInput) => {
  const categoria = await prisma.categoria.create({
    data,
  });

  return categoria;
};

// Actualizar categoría
export const updateCategoria = async (id: number, data: UpdateCategoriaInput) => {
  const existing = await prisma.categoria.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Categoría no encontrada');
  }

  const categoria = await prisma.categoria.update({
    where: { id },
    data,
  });

  return categoria;
};

// Eliminar categoría (soft delete)
export const deleteCategoria = async (id: number) => {
  const categoria = await prisma.categoria.findUnique({
    where: { id },
    include: {
      _count: {
        select: { productos: true },
      },
    },
  });

  if (!categoria) {
    throw new NotFoundError('Categoría no encontrada');
  }

  // Verificar si tiene productos activos
  if (categoria._count.productos > 0) {
    throw new ConflictError(
      `No se puede eliminar la categoría porque tiene ${categoria._count.productos} productos asociados`
    );
  }

  await prisma.categoria.update({
    where: { id },
    data: { activo: false },
  });

  return { message: 'Categoría eliminada correctamente' };
};

// ============================================
// SERVICIOS DE DISTRIBUIDOR
// ============================================

// Obtener todos los distribuidores
export const getDistribuidores = async (includeInactive: boolean = false) => {
  const distribuidores = await prisma.distribuidor.findMany({
    where: includeInactive ? {} : { activo: true },
    include: {
      _count: {
        select: { movimientos: true },
      },
    },
    orderBy: { nombre: 'asc' },
  });

  return distribuidores.map((dist) => ({
    ...dist,
    totalMovimientos: dist._count.movimientos,
  }));
};

// Obtener distribuidor por ID
export const getDistribuidorById = async (id: number) => {
  const distribuidor = await prisma.distribuidor.findUnique({
    where: { id },
    include: {
      _count: {
        select: { movimientos: true },
      },
    },
  });

  if (!distribuidor) {
    throw new NotFoundError('Distribuidor no encontrado');
  }

  return {
    ...distribuidor,
    totalMovimientos: distribuidor._count.movimientos,
  };
};

// Crear distribuidor
export const createDistribuidor = async (data: CreateDistribuidorInput) => {
  const distribuidor = await prisma.distribuidor.create({
    data,
  });

  return distribuidor;
};

// Actualizar distribuidor
export const updateDistribuidor = async (id: number, data: UpdateDistribuidorInput) => {
  const existing = await prisma.distribuidor.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Distribuidor no encontrado');
  }

  const distribuidor = await prisma.distribuidor.update({
    where: { id },
    data,
  });

  return distribuidor;
};

// Eliminar distribuidor (soft delete)
export const deleteDistribuidor = async (id: number) => {
  const distribuidor = await prisma.distribuidor.findUnique({
    where: { id },
  });

  if (!distribuidor) {
    throw new NotFoundError('Distribuidor no encontrado');
  }

  await prisma.distribuidor.update({
    where: { id },
    data: { activo: false },
  });

  return { message: 'Distribuidor eliminado correctamente' };
};

// Obtener estadísticas de distribuidor
export const getDistribuidorStats = async (id: number) => {
  const distribuidor = await prisma.distribuidor.findUnique({
    where: { id },
  });

  if (!distribuidor) {
    throw new NotFoundError('Distribuidor no encontrado');
  }

  const stats = await prisma.movimientoInventario.aggregate({
    where: { distribuidorId: id },
    _count: { id: true },
    _sum: { total: true, cantidad: true },
  });

  return {
    distribuidor,
    estadisticas: {
      totalMovimientos: stats._count.id,
      montoTotal: stats._sum.total || 0,
      unidadesTotales: stats._sum.cantidad || 0,
    },
  };
};
