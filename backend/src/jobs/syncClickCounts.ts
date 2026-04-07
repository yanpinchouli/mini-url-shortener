import { prisma } from '@/lib/prisma.js'
import { redisClient } from '@/lib/redis.js'
import { UrlCache } from '@/types/url.type.js'
import logger from '@/utils/logger.js'

export async function syncClickCounts() {
  try {
    const shortCodes = await redisClient.sMembers('url:perm:clicks:pending')
    if (shortCodes.length === 0) {
      logger.info('Job syncClickCounts skipped')
      return
    }

    const updates: Pick<UrlCache, 'id' | 'clickCount'>[] = []
    for (const shortCode of shortCodes) {
      const hash = await redisClient.hGetAll(`url:perm:${shortCode}`)
      if (hash.id && hash.clickCount) {
        updates.push({ id: Number(hash.id), clickCount: Number(hash.clickCount) })
      }
    }

    await prisma.$transaction(
      updates.map(({ id, clickCount }) =>
        prisma.url.update({ where: { id }, data: { clickCount } })
      )
    )

    await redisClient.sRem('url:perm:clicks:pending', shortCodes)
    logger.info({ updated: updates.length }, 'Job syncClickCounts completed')
  } catch (err) {
    logger.error(err, 'Job syncClickCounts failed')
  }
}
