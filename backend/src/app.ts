import { apiReference } from '@scalar/express-api-reference'
import { RedisStore } from 'connect-redis'
import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import { rateLimit } from 'express-rate-limit'
import session from 'express-session'
import helmet from 'helmet'
import { isHttpError } from 'http-errors'
import z from 'zod'

import { env } from '@/config/env.js'
import { generateScalarConfig } from '@/lib/openapi.js'
import { redisClient } from '@/lib/redis.js'
import authRouter from '@/routes/auth.route.js'
import redirectRouter from '@/routes/redirect.route.js'
import urlRouter from '@/routes/url.route.js'
import { httpLogger, logger } from '@/utils/logger.js'

const app = express()

app.use(helmet())
app.use(cors({ origin: env.ALLOWED_ORIGINS, credentials: true }))
app.use(express.json())

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  })
)

app.use(
  session({
    name: '_session',
    store: new RedisStore({ client: redisClient }),
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
)

app.use(httpLogger)

const apiRouter = express.Router()
apiRouter.use(authRouter)
apiRouter.use(urlRouter)

app.use('/docs', removeCSP, apiReference(generateScalarConfig()))
app.use('/api/v1', apiRouter)
app.use('/', redirectRouter)

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) {
    return res.status(400).json(z.flattenError(err))
  }

  const status = isHttpError(err) ? err.status : 500
  const message = isHttpError(err) && err.expose ? err.message : 'Internal Server Error'

  if (status >= 500) logger.error(err)
  else logger.warn(err)

  res.status(status).json({ message })
})

function removeCSP(_req: Request, res: Response, next: NextFunction) {
  res.removeHeader('Content-Security-Policy')
  next()
}

export default app
