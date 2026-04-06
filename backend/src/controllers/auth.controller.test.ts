import argon2 from 'argon2'
import { randomUUID } from 'crypto'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import app from '@/index.js'
import { prisma } from '@/lib/prisma.js'

vi.mock('../lib/prisma.ts', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

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

  it('should return 400 when password is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'abc@example.com', password: 'too-short' })

    expect(res.status).toBe(400)
  })
})

describe('/api/v1/auth/login', async () => {
  const hashedPassword = await argon2.hash('1qaz2wsx3edc')

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

  it('should return 401 when credentials are invalid', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'wrong@email.com', password: 'wrong-password' })

    expect(res.status).toBe(401)
  })
})

describe('/api/v1/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 200 when logout is successful', async () => {
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
    expect(logoutRes.headers['set-cookie']).toBeUndefined()
  })

  it('should return 200 when user is not logged in', async () => {
    const res = await request(app).post('/api/v1/auth/logout')
    expect(res.status).toBe(200)
  })
})
