import { randomUUID } from 'crypto'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import app from '@/app.js'
import { prisma } from '@/lib/prisma.js'
import { redisClient } from '@/lib/redis.js'

vi.mock('@/lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    url: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('nanoid', () => ({
  customAlphabet: () => () => 'test12345',
}))

const MOCK_SHORT_CODE = 'test12345'
const MOCK_URL_ID = 1
const MOCK_USER_ID = randomUUID()
const MOCK_ORIGINAL_URL = 'https://www.example.com'

let mockUrlId = 1

function mockUrl(overrides = {}) {
  return {
    id: mockUrlId++,
    alias: MOCK_SHORT_CODE,
    originalUrl: MOCK_ORIGINAL_URL,
    clickCount: 0,
    userId: MOCK_USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

async function loginAsUser(agent: request.Agent) {
  const argon2 = await import('argon2')
  const hashedPassword = await argon2.hash('1qaz2wsx3edc')

  vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
    id: MOCK_USER_ID,
    email: 'abc@example.com',
    passwordHash: hashedPassword,
  })

  await agent
    .post('/api/v1/auth/login')
    .send({ email: 'abc@example.com', password: '1qaz2wsx3edc' })
}

beforeAll(async () => {
  if (!redisClient.isOpen) await redisClient.connect()
})

afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 50))
  await redisClient.quit()
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /:shortCode', () => {
  beforeEach(() => {
    vi.spyOn(redisClient, 'hGetAll').mockResolvedValue({})
    vi.spyOn(redisClient, 'hSet').mockResolvedValue(0)
    vi.spyOn(redisClient, 'hIncrBy').mockResolvedValue(1)
    vi.spyOn(redisClient, 'expire').mockResolvedValue(1)
    vi.spyOn(redisClient, 'sAdd').mockResolvedValue(1)
  })

  it('should redirect 302 from temp cache', async () => {
    vi.spyOn(redisClient, 'hGetAll').mockResolvedValueOnce({
      originalUrl: MOCK_ORIGINAL_URL,
      clickCount: '5',
    })

    const res = await request(app).get(`/${MOCK_SHORT_CODE}`)

    expect(res.status).toBe(302)
    expect(res.headers['location']).toBe(MOCK_ORIGINAL_URL)
  })

  it('should redirect 302 from perm cache', async () => {
    vi.spyOn(redisClient, 'hGetAll')
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ originalUrl: MOCK_ORIGINAL_URL, clickCount: '5' })

    const res = await request(app).get(`/${MOCK_SHORT_CODE}`)

    expect(res.status).toBe(302)
    expect(res.headers['location']).toBe(MOCK_ORIGINAL_URL)
  })

  it('should redirect 302 from DB when cache miss, and write to Redis', async () => {
    vi.mocked(prisma.url.findFirst).mockResolvedValue(mockUrl())

    const res = await request(app).get(`/${MOCK_SHORT_CODE}`)

    expect(res.status).toBe(302)
    expect(res.headers['location']).toBe(MOCK_ORIGINAL_URL)
    expect(redisClient.hSet).toHaveBeenCalled()
  })

  it('should return 404 when short code not found', async () => {
    vi.mocked(prisma.url.findFirst).mockResolvedValue(null)

    const res = await request(app).get(`/${MOCK_SHORT_CODE}`)

    expect(res.status).toBe(404)
  })
})

describe('POST /api/v1/urls (guest)', () => {
  beforeEach(() => {
    vi.spyOn(redisClient, 'exists').mockResolvedValue(0)
    vi.spyOn(redisClient, 'hSet').mockResolvedValue(0)
    vi.spyOn(redisClient, 'expire').mockResolvedValue(1)
  })

  it('should return 201 with short url', async () => {
    const res = await request(app).post('/api/v1/urls').send({ originalUrl: MOCK_ORIGINAL_URL })

    expect(res.status).toBe(201)
    expect(res.body.message).toContain(MOCK_SHORT_CODE)
  })

  it('should return 400 when originalUrl is invalid', async () => {
    const res = await request(app).post('/api/v1/urls').send({ originalUrl: 'not-a-url' })

    expect(res.status).toBe(400)
  })
})

describe('POST /api/v1/urls (authenticated user)', () => {
  let agent: request.Agent

  beforeEach(async () => {
    vi.spyOn(redisClient, 'exists').mockResolvedValue(0)
    vi.spyOn(redisClient, 'hSet').mockResolvedValue(0)
    vi.spyOn(redisClient, 'expire').mockResolvedValue(1)

    agent = request.agent(app)
    await loginAsUser(agent)
  })

  it('should return 201 with short url', async () => {
    vi.mocked(prisma.url.create).mockResolvedValue(mockUrl())

    const res = await agent.post('/api/v1/urls').send({ originalUrl: MOCK_ORIGINAL_URL })

    expect(res.status).toBe(201)
    expect(res.body.message).toContain(MOCK_SHORT_CODE)
  })

  it('should return 201 with custom alias', async () => {
    const alias = 'my-alias'
    vi.mocked(prisma.url.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.url.create).mockResolvedValue(mockUrl({ alias }))

    const res = await agent.post('/api/v1/urls').send({ originalUrl: MOCK_ORIGINAL_URL, alias })

    expect(res.status).toBe(201)
    expect(res.body.message).toContain(alias)
  })

  it('should return 409 when alias is already in use', async () => {
    vi.mocked(prisma.url.findUnique).mockResolvedValue(mockUrl())

    const res = await agent
      .post('/api/v1/urls')
      .send({ originalUrl: MOCK_ORIGINAL_URL, alias: MOCK_SHORT_CODE })

    expect(res.status).toBe(409)
  })
})

describe('GET /api/v1/urls', () => {
  let agent: request.Agent

  beforeEach(async () => {
    agent = request.agent(app)
    await loginAsUser(agent)
  })

  it('should return 200 with url list', async () => {
    vi.mocked(prisma.url.findMany).mockResolvedValue([mockUrl()])

    const res = await agent.get('/api/v1/urls')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })

  it('should return 401 when not authenticated', async () => {
    const res = await request(app).get('/api/v1/urls')
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/v1/urls/:id', () => {
  let agent: request.Agent

  beforeEach(async () => {
    agent = request.agent(app)
    await loginAsUser(agent)
  })

  it('should return 204 when url is deleted', async () => {
    vi.mocked(prisma.url.deleteMany).mockResolvedValue({ count: 1 })

    const res = await agent.delete(`/api/v1/urls/${MOCK_URL_ID}`)

    expect(res.status).toBe(204)
  })

  it('should return 204 even when url does not exist', async () => {
    vi.mocked(prisma.url.deleteMany).mockResolvedValue({ count: 0 })

    const res = await agent.delete(`/api/v1/urls/${MOCK_URL_ID}`)

    expect(res.status).toBe(204)
  })

  it('should return 401 when not authenticated', async () => {
    const res = await request(app).delete(`/api/v1/urls/${MOCK_URL_ID}`)
    expect(res.status).toBe(401)
  })
})
