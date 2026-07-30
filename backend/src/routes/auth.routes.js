import express from 'express';
import { signup, login, refresh, logout, me } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createRateLimiter } from '../middleware/rateLimit.middleware.js';
import { signupSchema, loginSchema } from '../utils/schemas/auth.schema.js';

const router = express.Router();

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many login attempts, please try again later' },
});

const signupLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: 'Too many accounts created, please try again later' },
});

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Manager signup, login and session refresh
 */

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Create a gym manager account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SignupRequest' }
 *     responses:
 *       201:
 *         description: Account created; refresh token set as an httpOnly cookie
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SessionResponse' }
 *       400: { description: Validation failed }
 *       409: { description: Email already in use }
 */
router.post('/signup', signupLimiter, validate({ body: signupSchema }), signup);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in
 *     description: >
 *       With `rememberMe` the refresh token is long lived, keeping the manager
 *       signed in on that device; otherwise it expires after a day.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginRequest' }
 *     responses:
 *       200:
 *         description: Logged in
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SessionResponse' }
 *       401: { description: Invalid email or password }
 *       429: { description: Too many login attempts }
 */
router.post('/login', loginLimiter, validate({ body: loginSchema }), login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Rotate the refresh token and issue a new access token
 *     description: >
 *       Reads the httpOnly refresh cookie. The presented token is revoked and
 *       replaced. Replaying an already-rotated token revokes the whole session
 *       family, on the assumption it was stolen.
 *     tags: [Auth]
 *     responses:
 *       200: { description: New access token issued }
 *       401: { description: Missing, expired or revoked refresh token }
 */
router.post('/refresh', refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out and revoke the refresh token
 *     tags: [Auth]
 *     responses:
 *       204: { description: Logged out }
 */
router.post('/logout', logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: The signed-in manager
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user }
 *       401: { description: Not authenticated }
 */
router.get('/me', protect, me);

export default router;
