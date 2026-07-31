import jwt from 'jsonwebtoken';
import crypto from 'crypto';

function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
}

function signRefreshToken(userId, rememberMe) {
  const expiresIn = rememberMe
    ? process.env.JWT_REFRESH_EXPIRES_IN_LONG || '30d'
    : process.env.JWT_REFRESH_EXPIRES_IN_SHORT || '1d';

  const token = jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn });
  return { token, expiresAt: expiryDateFromNow(expiresIn) };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function expiryDateFromNow(expiresIn) {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  const [, amountStr, unit] = match;
  const amount = Number(amountStr);
  const unitMs = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return new Date(Date.now() + amount * unitMs[unit]);
}

export { signAccessToken, signRefreshToken, hashToken };
