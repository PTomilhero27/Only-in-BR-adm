import { useMutation } from "@tanstack/react-query"
import { authService } from "./service"
import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from "./schemas"

export function useLoginMutation() {
  return useMutation<LoginResponse, Error, LoginRequest>({
    mutationFn: (payload) => authService.login(payload),
  })
}

export function useRegisterUserMutation() {
  return useMutation<RegisterResponse, Error, RegisterRequest>({
    mutationFn: (payload) => authService.register(payload),
  })
}
