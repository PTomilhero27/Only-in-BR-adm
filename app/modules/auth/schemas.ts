import { z } from "zod"

export const loginRequestSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
})

export const authUserSchema = z.object({
  id: z.string().uuid().or(z.string()),
  name: z.string(),
  email: z.string().email(),
  role: z.string(),
})

export const loginResponseSchema = z.object({
  access_token: z.string(),
  user: authUserSchema,
})

/* =========================
   Register (Admin create)
========================= */

export const registerRequestSchema = z.object({
  name: z.string().min(2, "Informe o nome."),
  email: z.string().email("E-mail inválido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  // por enquanto tudo ADMIN, mas já deixo o campo para o futuro
  role: z.string().optional(),
})

export const registerResponseSchema = z.object({
  id: z.string().uuid().or(z.string()),
  name: z.string(),
  email: z.string().email(),
  role: z.string(),
})

export type LoginRequest = z.infer<typeof loginRequestSchema>
export type LoginResponse = z.infer<typeof loginResponseSchema>
export type AuthUser = z.infer<typeof authUserSchema>

export type RegisterRequest = z.infer<typeof registerRequestSchema>
export type RegisterResponse = z.infer<typeof registerResponseSchema>
