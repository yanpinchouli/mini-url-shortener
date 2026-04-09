import 'dotenv/config'

import z from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  SESSION_SECRET: z.string().min(64),
  ALLOWED_ORIGINS: z
    .string()
    .transform((origins) => origins.split(',').map((origin) => origin.trim()))
    .pipe(z.array(z.url()).nonempty()),
})

const parsed = EnvSchema.safeParse(process.env)

/* v8 ignore next 8 */
if (!parsed.success) {
  const { fieldErrors } = z.flattenError(parsed.error)

  console.error('Invalid ENV:')
  for (const [key, errors] of Object.entries(fieldErrors)) {
    console.error(`- ${key}: ${errors.join(', ')}`)
  }
  process.exit(1)
}

export const env = parsed.data
