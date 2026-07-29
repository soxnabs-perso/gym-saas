import { z } from 'zod';
import { objectId, emptyStringToUndefined, paginationSchema } from './common.schema.js';

export const INVOICE_STATUSES = ['pending', 'paid', 'overdue', 'cancelled'];

/**
 * @swagger
 * components:
 *   schemas:
 *     InvoiceRequest:
 *       type: object
 *       required: [customerId, amount, dueDate]
 *       properties:
 *         customerId:  { type: string }
 *         amount:      { type: number, minimum: 0, example: 25000 }
 *         currency:    { type: string, default: 'XOF' }
 *         description: { type: string }
 *         dueDate:     { type: string, format: date }
 *     Invoice:
 *       type: object
 *       properties:
 *         _id:           { type: string }
 *         invoiceNumber: { type: string, example: 'INV-MS5ZL76N-P7E0' }
 *         amount:        { type: number }
 *         currency:      { type: string }
 *         status:        { type: string, enum: [pending, paid, overdue, cancelled] }
 *         dueDate:       { type: string, format: date-time }
 *         paidAt:        { type: string, format: date-time, nullable: true }
 */

export const createInvoiceSchema = z
  .object({
    customerId: objectId,
    // Rejecting NaN/Infinity here keeps them out of the revenue aggregation,
    // where they would silently poison every dashboard total.
    amount: z.coerce
      .number()
      .refine(Number.isFinite, 'Amount must be a number')
      .nonnegative('Amount cannot be negative')
      .max(1_000_000_000),
    currency: z.string().trim().min(3).max(8).default('XOF'),
    description: emptyStringToUndefined(z.string().trim().max(300).optional()),
    dueDate: z.coerce.date('Due date is invalid'),
  })
  .strict();

export const updateInvoiceStatusSchema = z
  .object({ status: z.enum(INVOICE_STATUSES) })
  .strict();

export const listInvoicesQuerySchema = paginationSchema
  .extend({
    customerId: objectId.optional(),
    status: z.enum(INVOICE_STATUSES).optional(),
  })
  .strict();
