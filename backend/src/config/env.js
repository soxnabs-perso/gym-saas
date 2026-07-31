/**
 * Fails the process at boot when required configuration is missing rather than at the first request that needs it.
 *
 * Called from server.js only so the test suite can build the app before setting its own environment.
 */
const REQUIRED = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

const PLACEHOLDERS = new Set([
  'access_secret',
  'jwt_refresh_secret',
  'change_this_access_secret',
  'change_this_refresh_secret',
]);

export function assertEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Copy .env.example to .env and fill it in.'
    );
  }

  if (process.env.NODE_ENV === 'production') {
    const weak = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].filter(
      (key) => PLACEHOLDERS.has(process.env[key]) || process.env[key].length < 32
    );

    if (weak.length) {
      throw new Error(
        `Refusing to start in production with a default or short secret: ${weak.join(', ')}. ` +
          'Use a random value of at least 32 characters.'
      );
    }
  }
}

export default assertEnv;
