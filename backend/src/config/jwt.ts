export interface JwtConfig {
  /** Secret key for signing access tokens */
  accessSecret: string;
  /** Secret key for signing refresh tokens */
  refreshSecret: string;
  /** Access token expiration (e.g., "15m", "1h") */
  accessExpiresIn: string;
  /** Refresh token expiration (e.g., "7d", "30d") */
  refreshExpiresIn: string;
  /** Token issuer claim */
  issuer: string;
  /** Token audience claim */
  audience: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const jwtConfig: JwtConfig = {
  accessSecret: requireEnv('JWT_SECRET'),
  refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
  accessExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  issuer: 'video-challenge-api',
  audience: 'video-challenge-app',
};

export { jwtConfig };
export default jwtConfig;
