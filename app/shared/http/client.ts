/**
 * Instância do ky com baseURL e injeção automática do JWT.
 * Assim, cada módulo só foca em endpoints e contratos.
 */

import ky from "ky";
import { tokenStore } from "../auth/token";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL não definida em .env.local");
}

export const http = ky.create({
  prefixUrl: API_URL,
  timeout: 20_000,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = tokenStore.get();
        if (token) request.headers.set("Authorization", `Bearer ${token}`);
      },
    ],
  },
});
