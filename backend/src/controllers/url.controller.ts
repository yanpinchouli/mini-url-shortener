import type { Request, Response } from 'express'
import createHttpError from 'http-errors'
import { customAlphabet } from 'nanoid'
import z from 'zod'

import { prisma } from '@/lib/prisma.js'
import { redisClient } from '@/lib/redis.js'
import {
  CreateUrlSchema,
  DeleteUrlSchema,
  RedirectUrlSchema,
  UrlCache,
  UserCreateUrlSchema,
} from '@/types/url.type.js'
import logger from '@/utils/logger.js'

// 9 chars to minimize collision probability, see https://zelark.github.io/nano-id-cc/
const MIN_NANOID_LENGTH = 9
const NANOID_ALPHABET = '0123456789_abcdefghijklmnopqrstuvwxyz-'
const nanoid = customAlphabet(NANOID_ALPHABET, MIN_NANOID_LENGTH)

const TEMP_URL_CACHE_TTL = 60 * 60 * 24 * 7 // 7 days
const PERMANENT_URL_CACHE_TTL = 60 * 60 * 24 // 24 hours

const UrlController = {
  /**
   * Redirect to original url
   *
   * - if short code is not valid, return 404
   * - searching in Redis first, if not found, search in DB
   * - if found, increment click count
   * - jobs/syncClickCounts.ts will sync click counts from Redis to DB
   */
  async redirectToOriginalUrl(req: Request, res: Response) {
    const parsed = RedirectUrlSchema.safeParse(req.params)
    if (!parsed.success) {
      logger.warn(z.treeifyError(parsed.error), 'Invalid short code / alias')
      throw createHttpError.NotFound()
    }
    const shortCode = parsed.data.shortCode

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
      await redisClient.sAdd('url:perm:clicks:pending', shortCode)
      res.redirect(302, permanentUrlCache.originalUrl)
      return
    }

    const url = await prisma.url.findFirst({
      where: { alias: shortCode },
    })

    if (!url) {
      throw new createHttpError.NotFound()
    }

    const payload: UrlCache = {
      originalUrl: url.originalUrl,
      createdAt: url.createdAt.toISOString(),
      clickCount: url.clickCount + 1,
      id: url.id,
    }

    await redisClient.hSet(`url:perm:${shortCode}`, payload)
    await redisClient.expire(`url:perm:${shortCode}`, PERMANENT_URL_CACHE_TTL)
    await redisClient.sAdd('url:perm:clicks:pending', shortCode)

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
      shortCode = nanoid()
    } while (await redisClient.exists(`url:temp:${shortCode}`))

    const payload: Omit<UrlCache, 'id'> = {
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
    const userId = req.session.userId!

    if (alias) {
      const url = await prisma.url.findUnique({ where: { alias } })
      if (url || (await redisClient.exists(`url:perm:${alias}`))) {
        throw new createHttpError.Conflict('The alias is already in use')
      }
    }

    const shortCode = alias || nanoid()

    const url = await prisma.url.create({
      data: {
        originalUrl,
        alias: shortCode,
        userId,
      },
    })

    const payload: UrlCache = {
      originalUrl: url.originalUrl,
      createdAt: url.createdAt.toISOString(),
      clickCount: url.clickCount,
      id: url.id,
    }

    await redisClient.hSet(`url:perm:${shortCode}`, payload)
    await redisClient.expire(`url:perm:${shortCode}`, PERMANENT_URL_CACHE_TTL)

    const baseUrl = `${req.protocol}://${req.host}`
    res.status(201).json({ message: `${baseUrl}/${shortCode}` })
  },

  async getShortUrls(req: Request, res: Response) {
    const userId = req.session.userId!

    const shortUrls = await prisma.url.findMany({ where: { userId } })
    res.status(200).json(shortUrls)
  },

  async deleteShortUrl(req: Request, res: Response) {
    const { id } = DeleteUrlSchema.parse(req.params)
    const userId = req.session.userId!

    // deleteMany avoids throwing when record not found
    const { count } = await prisma.url.deleteMany({ where: { id, userId } })
    logger.info({ id, userId, count }, 'Short url deleted')

    res.sendStatus(204)
  },
}

export default UrlController
