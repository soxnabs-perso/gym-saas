import express from 'express';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  archiveCustomer,
  restoreCustomer,
} from '../controllers/customer.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuerySchema,
} from '../utils/schemas/customer.schema.js';
import { idParamSchema } from '../utils/schemas/common.schema.js';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Customers
 *   description: Gym members belonging to the signed-in manager
 */

/**
 * @swagger
 * /customers:
 *   get:
 *     summary: List customers
 *     tags: [Customers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page,   schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit,  schema: { type: integer, default: 50, maximum: 200 } }
 *       - { in: query, name: status, schema: { type: string, enum: [active, paused, cancelled] } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - in: query
 *         name: archived
 *         schema: { type: boolean, default: false }
 *         description: Return archived customers instead of active ones
 *     responses:
 *       200: { description: Paginated list of customers }
 *       401: { description: Not authenticated }
 *   post:
 *     summary: Add a customer
 *     tags: [Customers]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CustomerRequest' }
 *     responses:
 *       201: { description: Customer created }
 *       400: { description: Validation failed }
 */
router.get('/', validate({ query: listCustomersQuerySchema }), listCustomers);
router.post('/', validate({ body: createCustomerSchema }), createCustomer);

/**
 * @swagger
 * /customers/{id}:
 *   get:
 *     summary: Get one customer
 *     tags: [Customers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: The customer }
 *       404: { description: Customer not found }
 *   patch:
 *     summary: Update a customer
 *     tags: [Customers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Updated customer }
 */
router.get('/:id', validate({ params: idParamSchema }), getCustomer);
router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateCustomerSchema }),
  updateCustomer
);

/**
 * @swagger
 * /customers/{id}/archive:
 *   post:
 *     summary: Archive a customer
 *     description: >
 *       Customers are archived rather than deleted, so their invoice history
 *       survives and the action can be undone. Archived customers are hidden
 *       from the default list and cannot be invoiced until restored. There is
 *       deliberately no delete endpoint.
 *     tags: [Customers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: The archived customer }
 *       404: { description: Not found, or already archived }
 * /customers/{id}/restore:
 *   post:
 *     summary: Restore an archived customer
 *     tags: [Customers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: The restored customer }
 *       404: { description: Not found, or not archived }
 */
router.post('/:id/archive', validate({ params: idParamSchema }), archiveCustomer);
router.post('/:id/restore', validate({ params: idParamSchema }), restoreCustomer);

export default router;
