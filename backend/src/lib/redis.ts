import { createClient } from 'redis'

import { env } from '@/config/env.js'

const redisClient = createClient({
  url: env.REDIS_URL,
})

export { redisClient }
