import { createDocument } from 'zod-openapi'
import type { ZodOpenApiPathsObject } from 'zod-openapi'
import pkg from '../../package.json' with { type: 'json' }

const paths: ZodOpenApiPathsObject = {}

export function registerPath(path: string, item: ZodOpenApiPathsObject[string]) {
  paths[path] = item
}

export function generateSpec() {
  return createDocument({
    openapi: '3.1.0',
    info: { title: 'Mini URL Shortener API', version: pkg.version },
    servers: [{ url: '/api/v1' }],
    paths,
  })
}
