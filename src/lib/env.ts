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
  OPENAI_API_KEY: optionalString,
  OPENAI_BANK_STATEMENT_MODEL: optionalString,
  OPENAI_DOCUMENT_IMPORT_MODEL: optionalString,
  OPENAI_OPENING_BALANCE_MODEL: optionalString,
});

export function getEnv() {
  return envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_PATH: process.env.DATABASE_PATH,
    RECEIPT_PDF_ROOT: process.env.RECEIPT_PDF_ROOT,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BANK_STATEMENT_MODEL: process.env.OPENAI_BANK_STATEMENT_MODEL,
    OPENAI_DOCUMENT_IMPORT_MODEL: process.env.OPENAI_DOCUMENT_IMPORT_MODEL,
    OPENAI_OPENING_BALANCE_MODEL: process.env.OPENAI_OPENING_BALANCE_MODEL,
  });
}
