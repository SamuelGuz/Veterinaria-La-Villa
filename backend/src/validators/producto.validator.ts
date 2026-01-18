import { z } from 'zod';

// ============================================
// VALIDADORES DE PRODUCTO
// ============================================

export const createProductoSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre es requerido' })
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(300, 'El nombre no puede exceder 300 caracteres')
    .trim(),
  descripcion: z
    .string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .optional()
    .nullable(),
  categoriaId: z
    .number({ required_error: 'La categoría es requerida' })
    .int('El ID de categoría debe ser un número entero')
    .positive('El ID de categoría debe ser positivo'),
  stockMinimo: z
    .number()
    .int('El stock mínimo debe ser un número entero')
    .min(0, 'El stock mínimo no puede ser negativo')
    .optional()
    .default(0),
  unidadMedida: z
    .string()
    .max(50, 'La unidad de medida no puede exceder 50 caracteres')
    .optional()
    .default('unidades'),
  precioCompra: z
    .number()
    .min(0, 'El precio de compra no puede ser negativo')
    .optional()
    .default(0),
  precioVenta: z
    .number()
    .min(0, 'El precio de venta no puede ser negativo')
    .optional()
    .default(0),
  activo: z.boolean().optional().default(true),
});

export const updateProductoSchema = createProductoSchema.partial();

export const queryProductosSchema = z.object({
  page: z.string().optional().transform(val => parseInt(val || '1', 10)),
  limit: z.string().optional().transform(val => parseInt(val || '10', 10)),
  search: z.string().optional(),
  categoriaId: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  stockBajo: z.string().optional().transform(val => val === 'true'),
  activo: z.string().optional().transform(val => val !== 'false'),
  orderBy: z.enum(['nombre', 'createdAt', 'stockMinimo', 'precioVenta']).optional().default('nombre'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

// Tipos inferidos
export type CreateProductoInput = z.infer<typeof createProductoSchema>;
export type UpdateProductoInput = z.infer<typeof updateProductoSchema>;
export type QueryProductosInput = z.infer<typeof queryProductosSchema>;
