/**
 * Service do módulo Auth.
 * Aqui ficam apenas chamadas HTTP relacionadas a Auth.
 */

import { api } from "@/app/shared/http/api";
import { loginRequestSchema, loginResponseSchema } from "./schemas";
import type { LoginRequest, LoginResponse } from "./types";

export const authService = {
  login(payload: LoginRequest) {
    return api.post<LoginResponse>("auth/login", payload, {
      requestSchema: loginRequestSchema,
      responseSchema: loginResponseSchema,
    });
  },
};
