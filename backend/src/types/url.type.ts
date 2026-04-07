import z from 'zod'

export const CreateUrlSchema = z.object({
  originalUrl: z.url(),
})

export const UserCreateUrlSchema = CreateUrlSchema.extend({
  alias: z.string().optional(),
})

export type UrlCache = {
  originalUrl: string
  createdAt: string
  clickCount: number
  id: number
}
