import z from 'zod'

export const UrlSchema = z.object({
  id: z.number().int().positive(),
  userId: z.uuid(),
  originalUrl: z.url(),
  alias: z.string().toLowerCase().min(5).max(50),
  clickCount: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export const RedirectUrlSchema = UrlSchema.pick({ alias: true })

export const CreateUrlSchema = UrlSchema.pick({ originalUrl: true })

export const UserCreateUrlSchema = UrlSchema.pick({ originalUrl: true, alias: true }).partial({
  alias: true,
})

export const DeleteUrlSchema = UrlSchema.pick({ id: true })

export type Url = z.infer<typeof UrlSchema>

export type UrlCache = Omit<Url, 'userId' | 'alias' | 'updatedAt'>
