import { createClient } from 'redis'

if (!process.env.REDIS_URL) throw new Error('ENV REDIS_URL is not defined')

const redisClient = createClient({
  url: process.env.REDIS_URL,
})

await redisClient.connect()

export { redisClient }
