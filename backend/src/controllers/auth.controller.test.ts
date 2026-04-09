import argon2 from 'argon2'
import { randomUUID } from 'crypto'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import app from '@/app.js'
import { prisma } from '@/lib/prisma.js'
import { redisClient } from '@/lib/redis.js'

vi.mock('@/lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

beforeAll(async () => {
  if (!redisClient.isOpen) await redisClient.connect()
})

afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 50))
  await redisClient.quit()
})

describe('/api/v1/auth/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 201 when signup is successful', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: randomUUID(),
      email: 'abc@example.com',
      passwordHash: '***********',
    })

    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'abc@example.com', password: '1qaz2wsx3edc' })

    expect(res.status).toBe(201)
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('should return 409 when user already exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: randomUUID(),
      email: 'abc@example.com',
      passwordHash: '***********',
    })

    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'abc@example.com', password: '1qaz2wsx3edc' })

    expect(res.status).toBe(409)
  })

  it('should return 400 when email is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'invalid-email', password: '1qaz2wsx3edc' })

    expect(res.status).toBe(400)
  })

  it('should return 400 when password is too short', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'abc@example.com', password: 'too-short' })

    expect(res.status).toBe(400)
  })
})

describe('/api/v1/auth/login', () => {
  let hashedPassword: string

  beforeAll(async () => {
    hashedPassword = await argon2.hash('1qaz2wsx3edc')
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: randomUUID(),
      email: 'abc@example.com',
      passwordHash: hashedPassword,
    })
  })

  it('should return 200 when login is successful', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'abc@example.com', password: '1qaz2wsx3edc' })

    expect(res.status).toBe(200)
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('should return 401 when user does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'abc@example.com', password: '1qaz2wsx3edc' })

    expect(res.status).toBe(401)
  })

  it('should return 401 when password is wrong', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'abc@example.com', password: 'wrong-password' })

    expect(res.status).toBe(401)
  })
})

describe('/api/v1/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 200 and clear cookie when logout is successful', async () => {
    const hashedPassword = await argon2.hash('1qaz2wsx3edc')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: randomUUID(),
      email: 'abc@example.com',
      passwordHash: hashedPassword,
    })

    const testAgent = request.agent(app)

    const loginRes = await testAgent
      .post('/api/v1/auth/login')
      .send({ email: 'abc@example.com', password: '1qaz2wsx3edc' })

    expect(loginRes.status).toBe(200)
    expect(loginRes.headers['set-cookie']).toBeDefined()

    const logoutRes = await testAgent.post('/api/v1/auth/logout')
    expect(logoutRes.status).toBe(200)

    const cookies = [logoutRes.headers['set-cookie']].flat()
    expect(cookies.some((c) => c.includes('Max-Age=0') || c.includes('Expires='))).toBe(true)
  })

  it('should return 200 when user is not logged in', async () => {
    const res = await request(app).post('/api/v1/auth/logout')
    expect(res.status).toBe(200)
  })
})
