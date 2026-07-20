import { registerAs } from '@nestjs/config';

export default registerAs('exchange', () => ({
  provider: process.env.EXCHANGE_RATE_PROVIDER ?? 'frankfurter',
  cacheTtl: parseInt(process.env.EXCHANGE_RATE_CACHE_TTL ?? '3600', 10),
}));
