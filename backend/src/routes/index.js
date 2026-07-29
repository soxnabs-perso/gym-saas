import express from 'express';
import authRoutes from './auth.routes.js';
import customerRoutes from './customer.routes.js';
import invoiceRoutes from './invoice.routes.js';
import healthRoutes from './health.routes.js';

const router = express.Router();

/**
 * @description API Routes
 */
router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/_health', healthRoutes);

export default router;