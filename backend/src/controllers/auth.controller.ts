import type { Request, Response } from 'express'
import type { CreateUser } from '../types/user.type.js'
import { prisma } from '../lib/prisma.js'
import logger from '../utils/logger.js'
import argon2 from 'argon2'
import createHttpError from 'http-errors'

const AuthController = {
  signup: async (req: Request, res: Response) => {
    const { email, password }: CreateUser = req.body

    const exists = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (exists) {
      logger.info({ email }, 'User already exists')
      throw new createHttpError.Conflict('User already exists')
    }

    const hashedPassword = await argon2.hash(password)

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
      },
    })

    req.session.userId = user.id

    logger.info({ user }, 'Signup successful')
    res.status(201).json({ message: 'Signup successful' })
  },
  login: async () => {},
  logout: async () => {},
}

export default AuthController
