import express from 'express';
import { healthCheck } from '../controllers/health.controller.js';

const router = express.Router();

/**
* @swagger
* /_health:
*   get:
*     summary: Health check
*     description: Check the health status of the API server
*     tags: [Health]
*     responses:
*       200:
*         description: Service is healthy
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 status:
*                   type: string
*                   example: 'OK'
*                 timestamp:
*                   type: string
*                   format: date-time
*                   example: '2024-01-15T10:30:00Z'
*                 uptime:
*                   type: number
*                   example: 3600
*                 version:
*                   type: string
*                   example: '1.0.0'
*/
router.get('/', 
    //[RouteAudit('Health Check'), cacheMiddleware], 
  healthCheck
);

export default router;