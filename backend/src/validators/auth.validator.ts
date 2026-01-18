import { z } from 'zod';

// ============================================
// VALIDADORES DE AUTENTICACIÓN
// ============================================

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'El email es requerido' })
    .email('Email inválido')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'La contraseña es requerida' })
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const registerSchema = z.object({
  email: z
    .string({ required_error: 'El email es requerido' })
    .email('Email inválido')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'La contraseña es requerida' })
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre: z
    .string({ required_error: 'El nombre es requerido' })
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  rol: z.enum(['ADMIN', 'USER']).optional().default('USER'),
});

export const updateUserSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase().trim().optional(),
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim()
    .optional(),
  rol: z.enum(['ADMIN', 'USER']).optional(),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .optional(),
});

// Tipos inferidos
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
