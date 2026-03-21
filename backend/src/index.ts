import { RedisStore } from 'connect-redis'
import cors from 'cors'
import 'dotenv/config'
import express from 'express'
import type { Request, Response } from 'express'
import { rateLimit } from 'express-rate-limit'
import session from 'express-session'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { createClient } from 'redis'
import logger from './utils/logger.js'
import authRouter from './routes/auth.route.js'
import { generateSpec } from './lib/openapi.js'
import { apiReference } from '@scalar/express-api-reference'

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

app.use(pinoHttp({ logger }))

app.use(express.json())

const router: Router = express.Router()

app.use('/api/v1', router)
app.use(
  '/docs',
  (_req, res, next) => {
    res.removeHeader('Content-Security-Policy')
    next()
  },
  apiReference({
    content: generateSpec(),
    metaData: { title: 'Mini URL API Docs' },
    customCss: '.scalar-mcp-layer { display: none !important; }',
    theme: 'moon',
    forceDarkModeState: 'dark',
    showDeveloperTools: 'never',
    hideDownloadButton: true,
    agent: { disabled: true },
    telemetry: false,
    hiddenClients: {
      shell: ['httpie', 'wget'],
      js: ['jquery', 'xhr', 'ofetch'],
      node: true,
      c: true,
      clojure: true,
      csharp: true,
      dart: true,
      fsharp: true,
      go: true,
      http: true,
      java: true,
      kotlin: true,
      objc: true,
      ocaml: true,
      php: true,
      powershell: true,
      python: true,
      r: true,
      ruby: true,
      rust: true,
      swift: true,
    },
  })
)

app.use((_req, res) => {
  res.status(404).json({ message: 'Not Found' })
})

app.use((err: Error, _req: Request, res: Response) => {
  logger.error(err)
  res.status(500).json({ message: 'Internal Server Error' })
})

app.listen(port, () => {
  logger.info(`Server running at http://127.0.0.1:${port}`)
})
