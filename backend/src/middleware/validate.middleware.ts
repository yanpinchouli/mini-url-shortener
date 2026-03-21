import type { NextFunction, Request, Response } from 'express'
import type { ZodType } from 'zod'
import { z } from 'zod'

export const validate = (schemas: { body?: ZodType; query?: ZodType; params?: ZodType }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const [key, schema] of Object.entries(schemas)) {
      const parseResult = schema.safeParse(req[key as 'body' | 'query' | 'params'])
      if (!parseResult.success) {
        return res.status(400).json(z.flattenError(parseResult.error))
      }

      req[key as 'body' | 'query' | 'params'] = parseResult.data
    }

    next()
  }
}
