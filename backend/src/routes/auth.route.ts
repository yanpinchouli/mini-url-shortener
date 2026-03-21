import express from 'express'
import { validate } from '../middleware/validate.middleware.js'
import { CreateUserSchema } from '../types/user.type.js'
import AuthController from '../controllers/auth.controller.js'
import { registerPath } from '../lib/openapi.js'

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
  },
})

const router = express.Router()

router.post('/auth/signup', validate({ body: CreateUserSchema }), AuthController.signup)

export default router
