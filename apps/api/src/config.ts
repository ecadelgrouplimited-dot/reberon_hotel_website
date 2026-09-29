import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';
import { repoRoot } from '@reberon/media';

loadEnv({ path: resolve(repoRoot(), '.env'), quiet: true });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  API_URL: z.string().url().default('http://localhost:4000'),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  ADMIN_URL: z.string().url().default('http://localhost:3001'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  REVALIDATE_SECRET: z.string().min(16),
  PREVIEW_SECRET: z.string().min(16),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  STORAGE_DRIVER: z.enum(['local']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./storage'),
  MEDIA_PUBLIC_URL: z.string().url().default('http://localhost:4000/media'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('Reberon Hotel <hello@reberonhotel.ug>'),
  TURNSTILE_SECRET: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
if (parsed.data.NODE_ENV === 'production' && /dev-only|change-me/.test(parsed.data.JWT_SECRET + parsed.data.REVALIDATE_SECRET)) {
  console.error('Refusing to start in production with development secrets.');
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
