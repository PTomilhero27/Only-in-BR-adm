/**
 * Hooks do React Query para o módulo Auth.
 * - useLoginMutation encapsula mutation + tipagem
 */

import { useMutation } from "@tanstack/react-query";
import { authService } from "./service";
import type { LoginRequest, LoginResponse } from "./types";

export function useLoginMutation() {
  return useMutation<LoginResponse, Error, LoginRequest>({
    mutationFn: (payload) => authService.login(payload),
  });
}
