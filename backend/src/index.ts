import { RedisStore } from 'connect-redis'
import cors from 'cors'
import 'dotenv/config'
import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import { rateLimit } from 'express-rate-limit'
import session from 'express-session'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { createClient } from 'redis'
import logger from './utils/logger.js'
import authRouter from './routes/auth.route.js'
import { generateScalarConfig } from './lib/openapi.js'
import { apiReference } from '@scalar/express-api-reference'
import { isHttpError } from 'http-errors'

if (!process.env.PORT) throw new Error('ENV PORT is not defined')
if (!process.env.NODE_ENV) throw new Error('ENV NODE_ENV is not defined')
if (!process.env.REDIS_URL) throw new Error('ENV REDIS_URL is not defined')
if (!process.env.DATABASE_URL) throw new Error('ENV DATABASE_URL is not defined')
if (!process.env.SESSION_SECRET) throw new Error('ENV SESSION_SECRET is not defined')
if (!process.env.ALLOWED_ORIGINS) throw new Error('ENV ALLOWED_ORIGINS is not defined')

const app = express()
const port = Number(process.env.PORT)

const redisClient = createClient({
  url: process.env.REDIS_URL,
})
await redisClient.connect()

app.use(helmet())

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS.split(','),
    credentials: true,
  })
)

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: 'Too many requests, please try again later.',
  })
)

app.use(
  session({
    name: '_session',
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
)

app.use(express.json())

app.use(
  pinoHttp({
    logger,
    serializers: {
      req: ({ method, url }) => ({ method, url }),
      res: ({ statusCode }) => ({ statusCode }),
    },
    customLogLevel: (_req, res, err) => {
      return err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
    },
  })
)

const router = express.Router()
router.use(authRouter)

app.use('/api/v1', router)

app.use(
  '/docs',
  (_req, res, next) => {
    res.removeHeader('Content-Security-Policy')
    next()
  },
  apiReference(generateScalarConfig())
)

app.use((_req, res) => {
  res.status(404).json({ message: 'Not Found' })
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const status = isHttpError(err) ? err.status : 500
  const message = isHttpError(err) && err.expose ? err.message : 'Internal Server Error'

  if (status >= 500) logger.error(err)
  else logger.warn(err)

  res.status(status).json({ message })
})

app.listen(port, () => {
  logger.info(`Server running at http://127.0.0.1:${port}`)
  logger.info(`Docs available at http://127.0.0.1:${port}/docs`)
})
