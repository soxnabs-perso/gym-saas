import express from 'express';
import {
  listInvoices,
  createInvoice,
  updateInvoiceStatus,
  dashboardSummary,
} from '../controllers/invoice.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { idempotent } from '../middleware/idempotency.middleware.js';
import {
  createInvoiceSchema,
  updateInvoiceStatusSchema,
  listInvoicesQuerySchema,
  summaryQuerySchema,
} from '../utils/schemas/invoice.schema.js';
import { idParamSchema } from '../utils/schemas/common.schema.js';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Invoices
 *   description: Invoices raised against a gym's customers
 */

/**
 * @swagger
 * /invoices/dashboard/summary:
 *   get:
 *     summary: Overview totals for the dashboard
 *     description: >
 *       Active customer count, revenue collected within the range (by payment
 *       date) and the amount still outstanding in it (by due date).
 *     tags: [Invoices]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [month, quarter, year], default: month }
 *         description: Calendar period to report on
 *     responses:
 *       200:
 *         description: Summary totals
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 range:             { type: string, enum: [month, quarter, year] }
 *                 from:              { type: string, format: date-time }
 *                 to:                { type: string, format: date-time }
 *                 totalCustomers:    { type: integer }
 *                 revenue:           { type: number }
 *                 outstandingAmount: { type: number }
 *                 outstandingCount:  { type: integer }
 */
router.get('/dashboard/summary', validate({ query: summaryQuerySchema }), dashboardSummary);

/**
 * @swagger
 * /invoices:
 *   get:
 *     summary: List invoices
 *     tags: [Invoices]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page,       schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit,      schema: { type: integer, default: 50, maximum: 200 } }
 *       - { in: query, name: customerId, schema: { type: string } }
 *       - { in: query, name: status,     schema: { type: string, enum: [pending, paid, overdue, cancelled] } }
 *     responses:
 *       200: { description: Paginated list of invoices }
 *   post:
 *     summary: Generate an invoice for a customer
 *     description: >
 *       Send an `Idempotency-Key` header to make the call safe to retry. A repeat of the same key and body replays the
 *       original response with `Idempotency-Replayed: true` rather than raising a second invoice. The header is
 *       optional; without it a retry creates another invoice, as an ordinary POST does.
 *     tags: [Invoices]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: false
 *         schema: { type: string, minLength: 8, maxLength: 255 }
 *         description: Unique per logical request, e.g. a UUID. Keys expire after 24 hours.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/InvoiceRequest' }
 *     responses:
 *       201: { description: Invoice created }
 *       400: { description: Validation failed }
 *       404: { description: Customer not found }
 *       409: { description: An identical request is still in flight; retry }
 *       422: { description: This key was already used for a different request }
 */
router.get('/', validate({ query: listInvoicesQuerySchema }), listInvoices);
router.post(
  '/',
  validate({ body: createInvoiceSchema }),
  idempotent('POST /invoices'),
  createInvoice
);

/**
 * @swagger
 * /invoices/{id}/status:
 *   patch:
 *     summary: Change an invoice's status
 *     description: >
 *       `overdue` is not settable. It is derived from `dueDate` each time an unpaid invoice is read, so writing it
 *       would leave the stored value contradicting the date. Set `pending` and let the due date decide.
 *     tags: [Invoices]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [pending, paid, cancelled] }
 *               cancellationReason:
 *                 type: string
 *                 maxLength: 300
 *                 description: Required when status is cancelled; ignored otherwise
 *     responses:
 *       200: { description: Updated invoice }
 *       400: { description: Cancelling without a reason }
 *       404: { description: Invoice not found }
 */
router.patch(
  '/:id/status',
  validate({ params: idParamSchema, body: updateInvoiceStatusSchema }),
  updateInvoiceStatus
);

export default router;
