/**
 * Instância do ky com baseURL e injeção automática do JWT.
 * Assim, cada módulo só foca em endpoints e contratos.
 */

import ky from "ky";
import { tokenStore } from "../auth/token";
import { emitSessionExpired } from "../auth/session-events";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL não definida em .env.local");
}

export const http = ky.create({
  prefixUrl: API_URL,
  timeout: false,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = tokenStore.get();
        if (token) request.headers.set("Authorization", `Bearer ${token}`);
      },
    ],
    afterResponse: [
      (_request, _options, response) => {
        const hasToken = !!tokenStore.get();

        if (hasToken && response.status === 401) {
          emitSessionExpired({ reason: "unauthorized" });
        }
      },
    ],
  },
});
