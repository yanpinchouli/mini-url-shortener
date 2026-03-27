import argon2 from 'argon2'
import type { Request, Response } from 'express'
import createHttpError from 'http-errors'

import { prisma } from '../lib/prisma.js'
import type { CreateUser } from '../types/user.type.js'
import logger from '../utils/logger.js'

const AuthController = {
  signup: async (req: Request, res: Response) => {
    const { email, password }: CreateUser = req.body

    const exists = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (exists) {
      logger.warn({ email }, 'User already exists')
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
  login: async (req: Request, res: Response) => {
    const { email, password }: CreateUser = req.body
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    })

    if (!user) {
      logger.warn({ email }, 'User not found')
      throw new createHttpError.Unauthorized('Invalid credentials')
    }

    const isValid = await argon2.verify(user.passwordHash, password)

    if (!isValid) {
      logger.warn({ email }, 'Invalid credentials')
      throw new createHttpError.Unauthorized('Invalid credentials')
    }

    req.session.userId = user.id

    logger.info({ user }, 'Login successful')
    res.status(200).json({ message: 'Login successful' })
  },
  logout: async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(200).json({ message: 'Logout successful' })

    const userId = req.session.userId

    req.session.destroy(() => {
      logger.info({ userId }, 'Logout successful')
      res.status(200).json({ message: 'Logout successful' })
    })
  },
}

export default AuthController
