import { z } from 'zod';

const optionalString = z.preprocess((value) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}, z.string().min(1).optional());

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_PATH: optionalString,
  RECEIPT_PDF_ROOT: optionalString,
});

export function getEnv() {
  return envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_PATH: process.env.DATABASE_PATH,
    RECEIPT_PDF_ROOT: process.env.RECEIPT_PDF_ROOT,
  });
}
