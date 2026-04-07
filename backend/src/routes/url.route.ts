import express from 'express'

import UrlController from '@/controllers/url.controller.js'
import { registerPath, withMessage } from '@/lib/openapi.js'
import { authenticateSession } from '@/middleware/auth.middleware.js'
import { UserCreateUrlSchema } from '@/types/url.type.js'

const router = express.Router()

router.post('/urls', async (req, res) => {
  if (req.session.userId) {
    await UrlController.createShortUrlAsUser(req, res)
  } else {
    await UrlController.createShortUrlAsGuest(req, res)
  }
})

router.use(authenticateSession)
// router.get('/urls')
// router.delete('/urls/:id')

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
    security: [],
  },
})

export default router
