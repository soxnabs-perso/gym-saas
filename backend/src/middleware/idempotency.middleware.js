import crypto from 'crypto';
import IdempotencyKey from '../models/IdempotencyKey.js';
import { ApiError } from '../utils/errors.js';

const HEADER = 'Idempotency-Key';

const VALID_KEY = /^[\x21-\x7e]{8,255}$/;

function fingerprintOf(scope, body) {
  return crypto.createHash('sha256').update(`${scope}:${JSON.stringify(body ?? {})}`).digest('hex');
}

export function idempotent(scope) {
  return async (req, res, next) => {
    const key = req.get(HEADER);
    if (!key) return next();

    if (!VALID_KEY.test(key)) {
      throw ApiError.badRequest(`${HEADER} must be 8-255 printable characters without spaces`);
    }

    const fingerprint = fingerprintOf(scope, req.validated?.body ?? req.body);

    let claim;
    try {
      claim = await IdempotencyKey.create({ owner: req.userId, key, fingerprint });
    } catch (err) {
      if (err?.code !== 11000) throw err;
      return replay(req, res, key, fingerprint);
    }

    captureResponse(res, claim._id);
    return next();
  };
}

async function replay(req, res, key, fingerprint) {
  const existing = await IdempotencyKey.findOne({ owner: req.userId, key }).lean();

  if (!existing) {
    throw ApiError.conflict('This request is already being processed, please retry');
  }

  if (existing.fingerprint !== fingerprint) {
    throw new ApiError(422, `${HEADER} has already been used for a different request`);
  }

  if (existing.statusCode === null) {
    res.set('Retry-After', '1');
    throw ApiError.conflict('This request is already being processed, please retry');
  }

  res.set('Idempotency-Replayed', 'true');
  return res.status(existing.statusCode).json(existing.response);
}

function captureResponse(res, claimId) {
  const sendJson = res.json.bind(res);

  res.json = (body) => {
    const succeeded = res.statusCode >= 200 && res.statusCode < 300;

    const bookkeeping = succeeded
      ? IdempotencyKey.updateOne({ _id: claimId }, { statusCode: res.statusCode, response: body })
      : IdempotencyKey.deleteOne({ _id: claimId });

    bookkeeping.catch((err) => {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Failed to record idempotency outcome:', err.message);
      }
    });

    return sendJson(body);
  };
}

export default idempotent;
