import { ApiError } from '../utils/errors.js';
import { allowedMethodsFor } from '../utils/allowedMethods.js';

function notFound(req, res, _next) {
  const allowed = allowedMethodsFor(req.app, req.path);

  if (allowed.length) {
    res.set('Allow', allowed.join(', '));
    return res.status(405).json({
      message: `${req.method} is not allowed here. Allowed: ${allowed.join(', ')}`,
    });
  }

  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

function errorHandler(err, req, res, _next) {
  if (process.env.NODE_ENV !== 'test') {
    console.error(err);
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid identifier' });
  }

  if (err.code === 11000) {
    const conflicting = Object.keys(err.keyValue || {}).filter((key) => key !== 'owner');
    const field = conflicting[0];

    return res.status(409).json({
      message: field
        ? `That ${field} is already in use`
        : 'A record like this already exists',
    });
  }

  const status = err.statusCode || 500;
  const message = status === 500 ? 'Something went wrong on our end' : err.message;
  res.status(status).json({ message });
}

export { notFound, errorHandler };
