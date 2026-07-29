import express from 'express';
import {
  listInvoices,
  createInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  dashboardSummary,
} from '../controllers/invoice.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createInvoiceSchema,
  updateInvoiceStatusSchema,
  listInvoicesQuerySchema,
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
 *     description: Customer count, revenue collected this month, and outstanding balance.
 *     tags: [Invoices]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Summary totals
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalCustomers:    { type: integer }
 *                 revenueThisMonth:  { type: number }
 *                 outstandingAmount: { type: number }
 *                 outstandingCount:  { type: integer }
 */
// Declared before '/:id' style routes so 'dashboard' is never read as an id.
router.get('/dashboard/summary', dashboardSummary);

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
 *     tags: [Invoices]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/InvoiceRequest' }
 *     responses:
 *       201: { description: Invoice created }
 *       400: { description: Validation failed }
 *       404: { description: Customer not found }
 */
router.get('/', validate({ query: listInvoicesQuerySchema }), listInvoices);
router.post('/', validate({ body: createInvoiceSchema }), createInvoice);

/**
 * @swagger
 * /invoices/{id}/status:
 *   patch:
 *     summary: Change an invoice's status
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
 *               status: { type: string, enum: [pending, paid, overdue, cancelled] }
 *     responses:
 *       200: { description: Updated invoice }
 *       404: { description: Invoice not found }
 */
router.patch(
  '/:id/status',
  validate({ params: idParamSchema, body: updateInvoiceStatusSchema }),
  updateInvoiceStatus
);

/**
 * @swagger
 * /invoices/{id}:
 *   delete:
 *     summary: Delete an invoice
 *     tags: [Invoices]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       204: { description: Deleted }
 */
router.delete('/:id', validate({ params: idParamSchema }), deleteInvoice);

export default router;
