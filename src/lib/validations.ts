import { z } from 'zod';

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string()
    .trim()
    .min(1, 'El email es requerido')
    .email('Ingresa un email válido')
    .max(255, 'Email demasiado largo'),
  password: z.string()
    .min(1, 'La contraseña es requerida')
    .min(6, 'Mínimo 6 caracteres')
    .max(128, 'Contraseña demasiado larga'),
});

export const registerSchema = z.object({
  fullName: z.string()
    .trim()
    .min(1, 'El nombre es requerido')
    .max(100, 'Nombre demasiado largo'),
  email: z.string()
    .trim()
    .min(1, 'El email es requerido')
    .email('Ingresa un email válido')
    .max(255, 'Email demasiado largo'),
  password: z.string()
    .min(6, 'Mínimo 6 caracteres')
    .max(128, 'Contraseña demasiado larga')
    .regex(/[a-zA-Z]/, 'Debe contener al menos una letra')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  referralCode: z.string()
    .max(20, 'Código demasiado largo')
    .optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
