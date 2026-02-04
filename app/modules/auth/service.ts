import { api } from "@/app/shared/http/api"
import {
  loginRequestSchema,
  loginResponseSchema,
  registerRequestSchema,
  registerResponseSchema,
} from "./schemas"
import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from "./schemas"

export const authService = {
  login(payload: LoginRequest) {
    return api.post<LoginResponse>("auth/login", payload, {
      requestSchema: loginRequestSchema,
      responseSchema: loginResponseSchema,
    })
  },

  register(payload: RegisterRequest) {
    return api.post<RegisterResponse>("auth/register", payload, {
      requestSchema: registerRequestSchema,
      responseSchema: registerResponseSchema,
    })
  },
}
