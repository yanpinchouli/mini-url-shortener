import express from 'express'

import UrlController from '@/controllers/url.controller.js'
import { registerPath } from '@/lib/openapi.js'

const router = express.Router()

router.get('/:shortCode', UrlController.redirectToOriginalUrl)

registerPath('/{shortCode}', {
  get: {
    servers: [{ url: '/' }],
    tags: ['Urls'],
    summary: 'Redirect to original URL',
    description: 'Open the short URL directly in your browser to follow the redirect.',
    parameters: [{ name: 'shortCode', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
      302: { description: 'Redirect to original url' },
      404: { description: 'Not found' },
    },
    security: [],
  },
})

export default router
