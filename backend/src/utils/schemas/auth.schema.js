import { object, string, boolean } from 'yup';
import { trimmedString, emailString, personName } from './common.schema.js';

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
 */

const IPasswordSchema = string()
  .matches(
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/,
    'Password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one number and one special character')
  .required();


const INameSchema = personName().required('Name is required');

const IEmailSchema = emailString().required('Email is required');

export const signupSchema = object({
  gymName: trimmedString().min(1, 'Gym name is required').max(120).required('Gym name is required'),
  fullName: INameSchema,
  email: IEmailSchema,
  password: IPasswordSchema,
  rememberMe: boolean().default(false),
}).noUnknown();

export const loginSchema = object({
  email: IEmailSchema,
  password: string().required('Password is required'),
  rememberMe: boolean().default(false),
}).noUnknown();