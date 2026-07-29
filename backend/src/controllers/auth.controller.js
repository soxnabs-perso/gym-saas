import * as authService from '../services/auth.service.js';

const REFRESH_COOKIE_NAME = 'refreshToken';

/**
 * Scoped to the auth routes so the refresh token is not attached to every
 * ordinary API call — it is only ever sent where it can be exchanged.
 */
const REFRESH_COOKIE_PATH = '/api/v1/auth';

function refreshCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: REFRESH_COOKIE_PATH,
  };
}

function sendSession(res, session, statusCode = 200) {
  res.cookie(REFRESH_COOKIE_NAME, session.refreshToken, refreshCookieOptions(session.expiresAt));
  return res.status(statusCode).json({ accessToken: session.accessToken, user: session.user });
}

export async function signup(req, res) {
  const session = await authService.signupUser(req.validated.body);
  return sendSession(res, session, 201);
}

export async function login(req, res) {
  const session = await authService.loginUser(req.validated.body);
  return sendSession(res, session);
}

export async function refresh(req, res) {
  const session = await authService.refreshSession(req.cookies[REFRESH_COOKIE_NAME]);
  res.cookie(REFRESH_COOKIE_NAME, session.refreshToken, refreshCookieOptions(session.expiresAt));
  return res.json({ accessToken: session.accessToken });
}

export async function logout(req, res) {
  await authService.logoutSession(req.cookies[REFRESH_COOKIE_NAME]);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
  return res.status(204).send();
}

export async function me(req, res) {
  const user = await authService.getCurrentUser(req.userId);
  return res.json({ user });
}
