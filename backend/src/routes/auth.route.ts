import express from 'express'
import { validate } from '../middleware/validate.middleware.js'
import { CreateUserSchema } from '../types/user.type.js'
import AuthController from '../controllers/auth.controller.js'
import { registerPath } from '../lib/openapi.js'
import { z } from 'zod'

const router = express.Router()

router.post('/auth/signup', validate({ body: CreateUserSchema }), AuthController.signup)
router.post('/auth/login', AuthController.login)

registerPath('/auth/signup', {
  post: {
    tags: ['Auth'],
    summary: 'signup',
    requestBody: {
      content: { 'application/json': { schema: CreateUserSchema } },
    },
    responses: {
      201: { description: 'Signup successful' },
      409: { description: 'User already exists' },
    },
    security: [],
  },
})

registerPath('/auth/login', {
  post: {
    tags: ['Auth'],
    summary: 'login',
    requestBody: {
      content: {
        'application/json': { schema: z.object({ email: z.string(), password: z.string() }) },
      },
    },
    responses: {
      200: { description: 'Login successful' },
      401: { description: 'Invalid credentials' },
    },
    security: [],
  },
})

export default router
