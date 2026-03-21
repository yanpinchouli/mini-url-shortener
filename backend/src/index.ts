import { RedisStore } from 'connect-redis'
import cors from 'cors'
import 'dotenv/config'
import express, { Express, Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import session from 'express-session'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { createClient, RedisClientType } from 'redis'
import logger from './utils/logger.js'

if (!process.env.PORT) throw new Error('ENV PORT is not defined')
if (!process.env.NODE_ENV) throw new Error('ENV NODE_ENV is not defined')
if (!process.env.REDIS_URL) throw new Error('ENV REDIS_URL is not defined')
if (!process.env.DATABASE_URL) throw new Error('ENV DATABASE_URL is not defined')
if (!process.env.SESSION_SECRET) throw new Error('ENV SESSION_SECRET is not defined')
if (!process.env.ALLOWED_ORIGINS) throw new Error('ENV ALLOWED_ORIGINS is not defined')

const app: Express = express()
const port: number = Number(process.env.PORT)

const redisClient: RedisClientType = createClient({
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

app.use(pinoHttp({ logger }))

app.use(express.json())

const router: Router = express.Router()

app.use('/api/v1', router)

app.listen(port, () => {
  logger.info(`Server running at http://127.0.0.1:${port}`)
})
