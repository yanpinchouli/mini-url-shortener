import { RedisStore } from 'connect-redis'
import 'dotenv/config'
import express, { Express, Router } from 'express'
import session from 'express-session'
import { createClient, RedisClientType } from 'redis'

const app: Express = express()
const port: number = Number(process.env.PORT)

const redisClient: RedisClientType = createClient({
  url: process.env.REDIS_URL,
})
await redisClient.connect()

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is not defined')
}

app.use(
  session({
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

const router: Router = express.Router()

app.use('/api/v1', router)

app.listen(port, () => {
  console.log(`Server running at http://127.0.0.1:${port}`)
})
