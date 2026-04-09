import pino from 'pino'
import { pinoHttp } from 'pino-http'

import { env } from '@/config/env.js'

function maskEmail(email: string) {
  const [name, domain] = email.split('@')
  return `${name.slice(0, 2)}***@${domain}`
}

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
  redact: {
    paths: ['*.email', '*.password', '*.passwordHash'],
    censor: (value, path) => {
      if (path.at(-1) === 'email') return maskEmail(String(value))
      return '[REDACTED]'
    },
  },
})

export const httpLogger = pinoHttp({
  logger,
  serializers: {
    req: ({ method, url }) => ({ method, url }),
    res: ({ statusCode }) => ({ statusCode }),
  },
  customLogLevel: (_req, res, err) => {
    return err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
  },
})

export default logger
