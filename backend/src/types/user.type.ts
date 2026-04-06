import z from 'zod'

export const CreateUserSchema = z.object({
  email: z.email(),
  password: z.string().min(12).max(64),
})
