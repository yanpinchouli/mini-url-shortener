import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '@/../generated/prisma/client.js'
import { env } from '@/config/env.js'

const connectionString = env.DATABASE_URL

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === 'production' ? ['warn', 'error'] : ['query', 'warn', 'error'],
})

export { prisma }
