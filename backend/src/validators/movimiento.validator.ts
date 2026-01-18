import { z } from 'zod';

// ============================================
// VALIDADORES DE MOVIMIENTO DE INVENTARIO
// ============================================

export const tipoMovimientoEnum = z.enum(['COMPRA', 'VENTA', 'AJUSTE']);

export const createMovimientoSchema = z.object({
  productoId: z
    .number({ required_error: 'El producto es requerido' })
    .int('El ID de producto debe ser un número entero')
    .positive('El ID de producto debe ser positivo'),
  tipoMovimiento: tipoMovimientoEnum,
  cantidad: z
    .number({ required_error: 'La cantidad es requerida' })
    .int('La cantidad debe ser un número entero')
    .refine(val => val !== 0, 'La cantidad no puede ser cero'),
  precioUnitario: z
    .number({ required_error: 'El precio unitario es requerido' })
    .min(0, 'El precio unitario no puede ser negativo'),
  distribuidorId: z
    .number()
    .int('El ID de distribuidor debe ser un número entero')
    .positive('El ID de distribuidor debe ser positivo')
    .optional()
    .nullable(),
  factura: z
    .string()
    .max(100, 'El número de factura no puede exceder 100 caracteres')
    .optional()
    .nullable(),
  notas: z
    .string()
    .max(500, 'Las notas no pueden exceder 500 caracteres')
    .optional()
    .nullable(),
  fecha: z
    .string()
    .datetime()
    .optional()
    .transform(val => val ? new Date(val) : new Date()),
});

export const queryMovimientosSchema = z.object({
  page: z.string().optional().transform(val => parseInt(val || '1', 10)),
  limit: z.string().optional().transform(val => parseInt(val || '20', 10)),
  productoId: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  tipoMovimiento: z.enum(['COMPRA', 'VENTA', 'AJUSTE']).optional(),
  distribuidorId: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  fechaInicio: z.string().optional().transform(val => val ? new Date(val) : undefined),
  fechaFin: z.string().optional().transform(val => val ? new Date(val) : undefined),
  orderBy: z.enum(['fecha', 'total', 'cantidad']).optional().default('fecha'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Tipos inferidos
export type TipoMovimiento = z.infer<typeof tipoMovimientoEnum>;
export type CreateMovimientoInput = z.infer<typeof createMovimientoSchema>;
export type QueryMovimientosInput = z.infer<typeof queryMovimientosSchema>;
