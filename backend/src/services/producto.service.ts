import prisma from '../config/database';
import { CreateProductoInput, UpdateProductoInput, QueryProductosInput } from '../validators';
import { NotFoundError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

// Tipo para producto con relaciones
interface ProductoConStock {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoriaId: number;
  stockMinimo: number;
  unidadMedida: string | null;
  precioCompra: Prisma.Decimal | null;
  precioVenta: Prisma.Decimal | null;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  categoria: {
    id: number;
    nombre: string;
  };
  inventarioActual: {
    cantidadActual: number;
    ultimaActualizacion: Date;
  } | null;
}

// Obtener todos los productos con paginación y filtros
export const getProductos = async (query: QueryProductosInput) => {
  const { page, limit, search, categoriaId, stockBajo, activo, orderBy, order } = query;
  const skip = (page - 1) * limit;

  // Construir condiciones de filtro
  const where: Prisma.ProductoWhereInput = {
    activo,
    ...(search && {
      OR: [
        { nombre: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(categoriaId && { categoriaId }),
  };

  // Obtener productos
  let productos = await prisma.producto.findMany({
    where,
    include: {
      categoria: {
        select: { id: true, nombre: true },
      },
      inventarioActual: {
        select: { cantidadActual: true, ultimaActualizacion: true },
      },
    },
    orderBy: { [orderBy]: order },
    skip,
    take: limit,
  });

  // Filtrar por stock bajo si es necesario
  if (stockBajo) {
    productos = productos.filter(
      (p) => (p.inventarioActual?.cantidadActual || 0) <= p.stockMinimo
    );
  }

  // Contar total
  const total = await prisma.producto.count({ where });

  return {
    data: productos.map((p) => ({
      ...p,
      stockActual: p.inventarioActual?.cantidadActual || 0,
      stockBajo: (p.inventarioActual?.cantidadActual || 0) <= p.stockMinimo,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// Obtener producto por ID
export const getProductoById = async (id: number): Promise<ProductoConStock> => {
  const producto = await prisma.producto.findUnique({
    where: { id },
    include: {
      categoria: {
        select: { id: true, nombre: true },
      },
      inventarioActual: {
        select: { cantidadActual: true, ultimaActualizacion: true },
      },
    },
  });

  if (!producto) {
    throw new NotFoundError('Producto no encontrado');
  }

  return producto;
};

// Crear producto
export const createProducto = async (data: CreateProductoInput) => {
  // Verificar que la categoría existe
  const categoria = await prisma.categoria.findUnique({
    where: { id: data.categoriaId },
  });

  if (!categoria) {
    throw new NotFoundError('Categoría no encontrada');
  }

  // Crear producto con inventario inicial
  const producto = await prisma.producto.create({
    data: {
      nombre: data.nombre,
      descripcion: data.descripcion,
      categoriaId: data.categoriaId,
      stockMinimo: data.stockMinimo || 0,
      unidadMedida: data.unidadMedida || 'unidades',
      precioCompra: data.precioCompra || 0,
      precioVenta: data.precioVenta || 0,
      activo: data.activo ?? true,
      inventarioActual: {
        create: {
          cantidadActual: 0,
        },
      },
    },
    include: {
      categoria: {
        select: { id: true, nombre: true },
      },
      inventarioActual: true,
    },
  });

  return producto;
};

// Actualizar producto
export const updateProducto = async (id: number, data: UpdateProductoInput) => {
  // Verificar que el producto existe
  const existingProducto = await prisma.producto.findUnique({
    where: { id },
  });

  if (!existingProducto) {
    throw new NotFoundError('Producto no encontrado');
  }

  // Si se cambia la categoría, verificar que existe
  if (data.categoriaId) {
    const categoria = await prisma.categoria.findUnique({
      where: { id: data.categoriaId },
    });

    if (!categoria) {
      throw new NotFoundError('Categoría no encontrada');
    }
  }

  const producto = await prisma.producto.update({
    where: { id },
    data,
    include: {
      categoria: {
        select: { id: true, nombre: true },
      },
      inventarioActual: true,
    },
  });

  return producto;
};

// Eliminar producto (soft delete)
export const deleteProducto = async (id: number) => {
  const producto = await prisma.producto.findUnique({
    where: { id },
  });

  if (!producto) {
    throw new NotFoundError('Producto no encontrado');
  }

  // Soft delete
  await prisma.producto.update({
    where: { id },
    data: { activo: false },
  });

  return { message: 'Producto eliminado correctamente' };
};

// Obtener productos con stock bajo
export const getProductosStockBajo = async () => {
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    include: {
      categoria: {
        select: { id: true, nombre: true },
      },
      inventarioActual: {
        select: { cantidadActual: true },
      },
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
    }));
};
