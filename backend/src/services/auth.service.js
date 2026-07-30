import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { signAccessToken, signRefreshToken, hashToken } from '../utils/tokens.js';
import { ApiError } from '../utils/errors.js';

function toPublicUser(user) {
  return {
    id: user._id,
    gymName: user.gymName,
    fullName: user.fullName,
    email: user.email,
  };
}

/**
 * Mints an access token and persists the hash of a fresh refresh token.
 * Only the hash is stored, so a leaked database dump cannot be replayed
 * against the API.
 */
async function issueSession(user, rememberMe) {
  const accessToken = signAccessToken(user._id.toString());
  const { token: refreshToken, expiresAt } = signRefreshToken(user._id.toString(), rememberMe);

  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    rememberMe,
    expiresAt,
  });

  return { accessToken, refreshToken, expiresAt, user: toPublicUser(user) };
}

export async function signupUser({ gymName, fullName, email, password, rememberMe }) {
  const existing = await User.findOne({ email }).lean();
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ gymName, fullName, email, passwordHash });

  return issueSession(user, rememberMe);
}

export async function loginUser({ email, password, rememberMe }) {
  const user = await User.findOne({ email }).select('+passwordHash');

  const valid = user
    ? await user.comparePassword(password)
    : await User.compareDummyPassword(password);

  if (!user || !valid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  return issueSession(user, rememberMe);
}

/**
 * Rotates a refresh token: the presented one is revoked and a new pair issued.
 *
 * Presenting a token that exists but is already revoked means a rotated token
 * was replayed — the token was captured, or the database leaked. Treating that
 * as a breach and revoking the user's whole token family limits the damage to
 * one rotation window instead of the token's full lifetime.
 */
export async function refreshSession(token) {
  if (!token) {
    throw ApiError.unauthorized('No refresh token provided');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw ApiError.unauthorized('Refresh token invalid or expired');
  }

  const stored = await RefreshToken.findOne({ tokenHash: hashToken(token) });

  if (!stored) {
    throw ApiError.unauthorized('Refresh token has been revoked');
  }

  if (stored.revokedAt) {
    await RefreshToken.updateMany(
      { user: stored.user, revokedAt: null },
      { revokedAt: new Date() }
    );
    throw ApiError.unauthorized('Refresh token has been revoked');
  }

  const user = await User.findById(decoded.sub);
  if (!user) {
    throw ApiError.unauthorized('User no longer exists');
  }

  stored.revokedAt = new Date();
  await stored.save();

  return issueSession(user, stored.rememberMe);
}

export async function logoutSession(token) {
  if (!token) return;
  await RefreshToken.updateOne(
    { tokenHash: hashToken(token), revokedAt: null },
    { revokedAt: new Date() }
  );
}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return toPublicUser(user);
}
