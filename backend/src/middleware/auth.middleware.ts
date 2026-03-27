import type { NextFunction, Request, Response } from 'express'
import createHttpError from 'http-errors'

export const authenticateSession = (req: Request, _res: Response, next: NextFunction) => {
  if (req.session.userId) {
    next()
  } else {
    throw new createHttpError.Unauthorized('Invalid credentials')
  }
}
