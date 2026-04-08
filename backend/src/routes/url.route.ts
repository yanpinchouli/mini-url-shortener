import express from 'express'
import z from 'zod'

import UrlController from '@/controllers/url.controller.js'
import { registerPath, withMessage } from '@/lib/openapi.js'
import { authenticateSession } from '@/middleware/auth.middleware.js'
import { UrlSchema, UserCreateUrlSchema } from '@/types/url.type.js'

const router = express.Router()

router.post('/urls', async (req, res) => {
  if (req.session.userId) {
    await UrlController.createShortUrlAsUser(req, res)
  } else {
    await UrlController.createShortUrlAsGuest(req, res)
  }
})

router.use(authenticateSession)
router.get('/urls', UrlController.getShortUrls)
router.delete('/urls/:id', UrlController.deleteShortUrl)

registerPath('/urls', {
  post: {
    tags: ['Urls'],
    summary: 'Create short URL',
    description:
      'Guest: expires in 7 days. Authenticated user: never expires, supports custom alias.',
    requestBody: {
      content: { 'application/json': { schema: UserCreateUrlSchema } },
    },
    responses: {
      201: withMessage('https://example.com/xxxxxxxx', 'Created'),
      409: withMessage(
        'The alias is already in use',
        'The alias is already in use (Authenticated user only)'
      ),
    },
  },
  get: {
    tags: ['Urls'],
    summary: 'Get URLs of the current user',
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: z.array(UrlSchema),
          },
        },
      },
    },
  },
})

registerPath('/urls/{id}', {
  delete: {
    tags: ['Urls'],
    summary: 'Delete short URL',
    description: 'User only can delete their own URLs',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
      204: { description: 'No content' },
    },
  },
})

export default router
