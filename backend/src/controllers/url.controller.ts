import type { Request, Response } from 'express'
import createHttpError from 'http-errors'
import { nanoid } from 'nanoid'
import Sqids from 'sqids'

import { prisma } from '@/lib/prisma.js'
import { redisClient } from '@/lib/redis.js'
import { CreateUrlSchema, UrlCache, UserCreateUrlSchema } from '@/types/url.type.js'

// 8 chars to minimize collision probability, see https://zelark.github.io/nano-id-cc/
// Also applied to sqids to keep a single length constant
const MIN_SHORT_CODE_LENGTH = 8

const TEMP_URL_CACHE_TTL = 60 * 60 * 24 * 7 // 7 days
const PERMANENT_URL_CACHE_TTL = 60 * 60 * 24 // 24 hours

const sqids = new Sqids({
  alphabet: 'otYI1m5ZsG3guxCJ4z6dTKaBUPrbONWSDeLVj9wAkqfERnXHMQp2li0yc87Fhv',
  minLength: MIN_SHORT_CODE_LENGTH,
})

const UrlController = {
  /**
   * Redirect to original url
   *
   * - if short code is not valid, return 404
   * - searching in Redis first, if not found, search in DB
   * - if found, increment click count
   */
  async redirectToOriginalUrl(req: Request, res: Response) {
    const shortCode = req.params.shortCode as string

    if (shortCode.length < MIN_SHORT_CODE_LENGTH) {
      throw new createHttpError.NotFound()
    }

    const tempUrlCache = await redisClient.hGetAll(`url:temp:${shortCode}`)
    if (tempUrlCache.originalUrl) {
      await redisClient.hIncrBy(`url:temp:${shortCode}`, 'clickCount', 1)
      res.redirect(302, tempUrlCache.originalUrl)
      return
    }

    const permanentUrlCache = await redisClient.hGetAll(`url:perm:${shortCode}`)
    if (permanentUrlCache.originalUrl) {
      await redisClient.hIncrBy(`url:perm:${shortCode}`, 'clickCount', 1)
      await redisClient.expire(`url:perm:${shortCode}`, PERMANENT_URL_CACHE_TTL)
      res.redirect(302, permanentUrlCache.originalUrl)
      return
    }

    const id: number | undefined = sqids.decode(shortCode)[0]
    const url = await prisma.url.findFirst({
      where: id !== undefined ? { OR: [{ id }, { alias: shortCode }] } : { alias: shortCode },
    })

    if (!url) {
      throw new createHttpError.NotFound()
    }

    const payload: UrlCache = {
      originalUrl: url.originalUrl,
      createdAt: url.createdAt.toISOString(),
      clickCount: url.clickCount + 1,
    }

    await redisClient.hSet(`url:perm:${shortCode}`, payload)
    await redisClient.expire(`url:perm:${shortCode}`, PERMANENT_URL_CACHE_TTL)

    res.redirect(302, url.originalUrl)
  },

  /**
   * Guest can create a temporary url:
   * - temp url only stored in Redis (no DB) for 7 days
   */
  async createShortUrlAsGuest(req: Request, res: Response) {
    const body = CreateUrlSchema.parse(req.body)
    const { originalUrl } = body

    // make sure short code is unique
    let shortCode
    do {
      shortCode = nanoid(MIN_SHORT_CODE_LENGTH)
    } while (await redisClient.exists(`url:temp:${shortCode}`))

    const payload: UrlCache = {
      originalUrl,
      createdAt: new Date().toISOString(),
      clickCount: 0,
    }

    await redisClient.hSet(`url:temp:${shortCode}`, payload)
    await redisClient.expire(`url:temp:${shortCode}`, TEMP_URL_CACHE_TTL)

    const baseUrl = `${req.protocol}://${req.host}`
    res.status(201).json({ message: `${baseUrl}/${shortCode}` })
  },

  /**
   * User can create a permanent url:
   * - with a custom alias (must be unique)
   * - if no alias is provided, generate short code via sqids (encoded from url DB id)
   * - permanently stored in DB
   * - cached in Redis for 24 hours, TTL refreshed on each click
   */
  async createShortUrlAsUser(req: Request, res: Response) {
    const body = UserCreateUrlSchema.parse(req.body)
    const { originalUrl, alias } = body
    const { userId } = req.session

    if (alias) {
      const url = await prisma.url.findUnique({ where: { alias } })
      if (url || (await redisClient.exists(`url:perm:${alias}`))) {
        throw new createHttpError.Conflict('The alias is already in use')
      }
    }

    const url = await prisma.url.create({
      data: {
        originalUrl,
        alias,
        userId,
      },
    })

    const shortCode = alias || sqids.encode([url.id])

    const payload: UrlCache = {
      originalUrl: url.originalUrl,
      createdAt: url.createdAt.toISOString(),
      clickCount: url.clickCount,
    }

    await redisClient.hSet(`url:perm:${shortCode}`, payload)
    await redisClient.expire(`url:perm:${shortCode}`, PERMANENT_URL_CACHE_TTL)

    const baseUrl = `${req.protocol}://${req.host}`
    res.status(201).json({ message: `${baseUrl}/${shortCode}` })
  },
}

export default UrlController
