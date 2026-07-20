import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),
  corsOrigins: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3000'],
  logLevel: process.env.LOG_LEVEL ?? 'debug',
  authUsername: process.env.AUTH_USERNAME ?? 'admin',
  authPassword: process.env.AUTH_PASSWORD ?? '',           // legacy plain-text fallback
  authPasswordHash: process.env.AUTH_PASSWORD_HASH ?? '',  // preferred: bcrypt hash
  jwtSecret: process.env.JWT_SECRET ?? 'change-me-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
}));
