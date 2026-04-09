import nodeCron from 'node-cron'

import app from '@/app.js'
import { env } from '@/config/env.js'
import { syncClickCounts } from '@/jobs/syncClickCounts.js'
import { redisClient } from '@/lib/redis.js'
import logger from '@/utils/logger.js'

async function startServer() {
  try {
    await redisClient.connect()
    logger.info('Connected to Redis')

    nodeCron.schedule('*/10 * * * *', syncClickCounts)
    logger.info('Cron job scheduled')

    app.listen(env.PORT, () => {
      logger.info(`Server running at http://127.0.0.1:${env.PORT}`)
      logger.info(`Docs available at http://127.0.0.1:${env.PORT}/docs`)
    })
  } catch (error) {
    logger.error(error, 'Failed to start server')
    process.exit(1)
  }
}

startServer()
