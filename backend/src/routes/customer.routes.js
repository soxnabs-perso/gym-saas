import express from 'express';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
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
 *   delete:
 *     summary: Remove a customer
 *     tags: [Customers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       204: { description: Removed }
 */
router.get('/:id', validate({ params: idParamSchema }), getCustomer);
router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateCustomerSchema }),
  updateCustomer
);
router.delete('/:id', validate({ params: idParamSchema }), deleteCustomer);

export default router;
