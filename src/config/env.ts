import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/doorloop_erp?schema=public'),
  JWT_ACCESS_SECRET: z.string().default('doorloop_access_token_secret_key_2026_super_secure'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().default('doorloop_refresh_token_secret_key_2026_super_secure'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.string().transform(Number).default('12'),
});

export const env = envSchema.parse(process.env);
