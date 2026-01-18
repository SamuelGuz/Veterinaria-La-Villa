import { z } from 'zod';

// ============================================
// VALIDADORES DE CATEGORÍA
// ============================================

export const createCategoriaSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre es requerido' })
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  descripcion: z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional()
    .nullable(),
  activo: z.boolean().optional().default(true),
});

export const updateCategoriaSchema = createCategoriaSchema.partial();

// ============================================
// VALIDADORES DE DISTRIBUIDOR
// ============================================

export const createDistribuidorSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre es requerido' })
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(200, 'El nombre no puede exceder 200 caracteres')
    .trim(),
  contacto: z
    .string()
    .max(100, 'El contacto no puede exceder 100 caracteres')
    .optional()
    .nullable(),
  telefono: z
    .string()
    .max(20, 'El teléfono no puede exceder 20 caracteres')
    .optional()
    .nullable(),
  email: z
    .string()
    .email('Email inválido')
    .max(100, 'El email no puede exceder 100 caracteres')
    .optional()
    .nullable(),
  direccion: z
    .string()
    .max(500, 'La dirección no puede exceder 500 caracteres')
    .optional()
    .nullable(),
  activo: z.boolean().optional().default(true),
});

export const updateDistribuidorSchema = createDistribuidorSchema.partial();

// Tipos inferidos
export type CreateCategoriaInput = z.infer<typeof createCategoriaSchema>;
export type UpdateCategoriaInput = z.infer<typeof updateCategoriaSchema>;
export type CreateDistribuidorInput = z.infer<typeof createDistribuidorSchema>;
export type UpdateDistribuidorInput = z.infer<typeof updateDistribuidorSchema>;
