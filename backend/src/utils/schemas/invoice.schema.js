import { object, string, number, date } from 'yup';
import {
  objectId,
  optionalObjectId,
  emptyStringToUndefined,
  paginationFields,
  trimmedString,
} from './common.schema.js';

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

export const createInvoiceSchema = object({
  customerId: objectId,
  amount: number()
    .typeError('Amount must be a number')
    .min(0, 'Amount cannot be negative')
    .max(1_000_000_000)
    .required('Amount is required'),
  currency: trimmedString().min(3).max(8).default('XOF'),
  description: emptyStringToUndefined(trimmedString().max(300)),
  dueDate: date().typeError('Due date is invalid').required('Due date is required'),
}).noUnknown();

export const CANCELLED = 'cancelled';

/** Ranges the dashboard can be scoped to. */
export const SUMMARY_RANGES = ['month', 'quarter', 'year'];

export const updateInvoiceStatusSchema = object({
  status: string().oneOf(INVOICE_STATUSES).required('Status is required'),
  cancellationReason: trimmedString()
    .max(300)
    .when('status', {
      is: CANCELLED,
      then: (schema) =>
        schema.min(1, 'A reason is required').required('A reason is required when cancelling'),
      otherwise: (schema) =>
        schema.strip(),
    }),
}).noUnknown();

export const summaryQuerySchema = object({
  range: string().oneOf(SUMMARY_RANGES).default('month'),
}).noUnknown();

export const listInvoicesQuerySchema = object({
  ...paginationFields,
  customerId: optionalObjectId,
  status: string().oneOf(INVOICE_STATUSES).optional(),
}).noUnknown();