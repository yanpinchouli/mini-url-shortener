import { defineConfig } from 'prisma/config'

import { env } from '@/config/env.js'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env.DATABASE_URL,
  },
})
