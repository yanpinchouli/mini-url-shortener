import { createDocument } from 'zod-openapi'
import type { ZodOpenApiPathsObject } from 'zod-openapi'
import pkg from '../../package.json' with { type: 'json' }

const paths: ZodOpenApiPathsObject = {}

export const registerPath = (path: string, item: ZodOpenApiPathsObject[string]) => {
  paths[path] = item
}

export const generateScalarConfig = () => {
  const content = createDocument({
    openapi: '3.1.0',
    info: { title: 'Mini URL Shortener API', version: pkg.version },
    servers: [{ url: '/api/v1' }],
    paths,
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: '_session',
        },
      },
    },
    security: [{ cookieAuth: [] }],
  })

  return {
    content,
    metaData: { title: 'Mini URL API Docs' },
    customCss: '.scalar-mcp-layer { display: none !important; }',
    theme: 'moon' as const,
    forceDarkModeState: 'dark' as const,
    showDeveloperTools: 'never' as const,
    hideDownloadButton: true,
    agent: { disabled: true },
    telemetry: false,
    hiddenClients: {
      shell: ['httpie', 'wget'] as string[],
      js: ['jquery', 'xhr', 'ofetch'] as string[],
      node: true,
      c: true,
      clojure: true,
      csharp: true,
      dart: true,
      fsharp: true,
      go: true,
      http: true,
      java: true,
      kotlin: true,
      objc: true,
      ocaml: true,
      php: true,
      powershell: true,
      python: true,
      r: true,
      ruby: true,
      rust: true,
      swift: true,
    },
  }
}
