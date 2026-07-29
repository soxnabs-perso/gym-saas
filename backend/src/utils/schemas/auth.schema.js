import { z } from 'zod';

/**
 * @swagger
 * components:
 *   schemas:
 *     SignupRequest:
 *       type: object
 *       required: [gymName, fullName, email, password]
 *       properties:
 *         gymName:    { type: string, example: 'Iron Yard Gym' }
 *         fullName:   { type: string, example: 'Awa Diop' }
 *         email:      { type: string, format: email }
 *         password:   { type: string, minLength: 8 }
 *         rememberMe: { type: boolean, default: false }
 *     LoginRequest:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:      { type: string, format: email }
 *         password:   { type: string }
 *         rememberMe: { type: boolean, default: false }
 *     SessionResponse:
 *       type: object
 *       properties:
 *         accessToken: { type: string }
 *         user:        { $ref: '#/components/schemas/User' }
 *     User:
 *       type: object
 *       properties:
 *         id:       { type: string }
 *         gymName:  { type: string }
 *         fullName: { type: string }
 *         email:    { type: string }
 *         role:     { type: string, enum: [owner, manager] }
 */

export const signupSchema = z
  .object({
    gymName: z.string().trim().min(1, 'Gym name is required').max(120),
    fullName: z.string().trim().min(1, 'Full name is required').max(120),
    email: z.email('Email is invalid').toLowerCase(),
    // Capped because bcrypt silently ignores input past 72 bytes.
    password: z.string().min(8, 'Password must be at least 8 characters').max(72),
    rememberMe: z.boolean().default(false),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.email('Email is invalid').toLowerCase(),
    password: z.string().min(1, 'Password is required').max(72),
    rememberMe: z.boolean().default(false),
  })
  .strict();
