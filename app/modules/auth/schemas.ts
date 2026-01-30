/**
 * Contratos do módulo Auth (espelha o Swagger).
 * Evita contratos implícitos e facilita manutenção.
 */

import { z } from "zod";

export const loginRequestSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
});

/**
 * User retornado no login.
 * Responsabilidade:
 * - Garantir tipagem consistente entre front e back
 * - Habilitar RoleGuard e UI baseada em permissão
 */
export const authUserSchema = z.object({
  id: z.string().uuid().or(z.string()), // caso seu id não seja UUID puro, mantém flexível
  name: z.string(),
  email: z.string().email(),
  role: z.string(), // se você quiser, a gente pode trocar por z.enum([...]) depois
});

export const loginResponseSchema = z.object({
  access_token: z.string(),
  user: authUserSchema,
});

// Tipos inferidos (opcional, mas recomendado)
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
