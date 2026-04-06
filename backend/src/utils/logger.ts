import pino from 'pino'

function maskEmail(email: string) {
  const [name, domain] = email.split('@')
  return `${name.slice(0, 2)}***@${domain}`
}

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
  redact: {
    paths: ['*.email', '*.password', '*.passwordHash'],
    censor: (value, path) => {
      if (path.at(-1) === 'email') return maskEmail(String(value))
      return '[REDACTED]'
    },
  },
})

export default logger
