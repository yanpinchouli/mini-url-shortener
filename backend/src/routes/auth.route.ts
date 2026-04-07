import express from 'express'
import z from 'zod'

import AuthController from '@/controllers/auth.controller.js'
import { registerPath, withMessage } from '@/lib/openapi.js'
import { CreateUserSchema } from '@/types/user.type.js'

const router = express.Router()

router.post('/auth/signup', AuthController.signup)
router.post('/auth/login', AuthController.login)
router.post('/auth/logout', AuthController.logout)

registerPath('/auth/signup', {
  post: {
    tags: ['Auth'],
    summary: 'Signup',
    requestBody: {
      content: { 'application/json': { schema: CreateUserSchema } },
    },
    responses: {
      201: withMessage('Signup successful', 'Signup successful'),
      409: withMessage('User already exists', 'User already exists'),
    },
    security: [],
  },
})

registerPath('/auth/login', {
  post: {
    tags: ['Auth'],
    summary: 'Login',
    requestBody: {
      content: {
        'application/json': { schema: CreateUserSchema.extend({ password: z.string() }) },
      },
    },
    responses: {
      200: withMessage('Login successful', 'Login successful'),
      401: withMessage('Invalid credentials', 'Invalid credentials'),
    },
    security: [],
  },
})

registerPath('/auth/logout', {
  post: {
    tags: ['Auth'],
    summary: 'Logout',
    responses: {
      200: withMessage('Logout successful', 'Logout successful'),
    },
    security: [],
  },
})

export default router
