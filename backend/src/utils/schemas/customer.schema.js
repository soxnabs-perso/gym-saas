import { z } from 'zod';
import { emptyStringToUndefined, paginationSchema } from './common.schema.js';

export const MEMBERSHIP_PLANS = ['monthly', 'quarterly', 'annual', 'pay_as_you_go'];
export const MEMBERSHIP_STATUSES = ['active', 'paused', 'cancelled'];

/**
 * @swagger
 * components:
 *   schemas:
 *     CustomerRequest:
 *       type: object
 *       required: [fullName]
 *       properties:
 *         fullName:       { type: string, example: 'Moussa Ndiaye' }
 *         email:          { type: string, format: email }
 *         phone:          { type: string }
 *         membershipPlan: { type: string, enum: [monthly, quarterly, annual, pay_as_you_go] }
 *     Customer:
 *       type: object
 *       properties:
 *         _id:              { type: string }
 *         fullName:         { type: string }
 *         email:            { type: string }
 *         phone:            { type: string }
 *         membershipPlan:   { type: string }
 *         membershipStatus: { type: string }
 *         joinedAt:         { type: string, format: date-time }
 */

export const createCustomerSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Customer name is required').max(120),
    // The form posts '' for untouched optional inputs. Left as-is those would
    // collide on the sparse unique (owner, email) index the moment a manager
    // added a second customer without an email.
    email: emptyStringToUndefined(z.email('Email is invalid').toLowerCase().optional()),
    phone: emptyStringToUndefined(z.string().trim().max(40).optional()),
    membershipPlan: z.enum(MEMBERSHIP_PLANS).default('monthly'),
  })
  .strict();

export const updateCustomerSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120).optional(),
    email: emptyStringToUndefined(z.email('Email is invalid').toLowerCase().optional()),
    phone: emptyStringToUndefined(z.string().trim().max(40).optional()),
    membershipPlan: z.enum(MEMBERSHIP_PLANS).optional(),
    membershipStatus: z.enum(MEMBERSHIP_STATUSES).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

export const listCustomersQuerySchema = paginationSchema
  .extend({
    status: z.enum(MEMBERSHIP_STATUSES).optional(),
    search: z.string().trim().max(120).optional(),
  })
  .strict();
