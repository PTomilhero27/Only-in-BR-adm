/**
 * Wrapper genérico para GET/POST/PATCH/DELETE.
 * - Centraliza parsing de erro do Nest
 * - Permite validação com Zod (request/response)
 * - ✅ Suporta multipart/form-data (FormData) e body raw (Blob/File)
 */

import { HTTPError } from "ky"
import { ZodError, ZodType } from "zod"
import { http } from "./client"
import { ApiError } from "./errors"

type ApiRequestOptions<TResponse> = {
  requestSchema?: ZodType<any>
  responseSchema?: ZodType<TResponse>
}

function isFormData(v: unknown): v is FormData {
  return typeof FormData !== "undefined" && v instanceof FormData
}

function isBlobLike(v: unknown): v is Blob {
  return typeof Blob !== "undefined" && v instanceof Blob
}

function isArrayBuffer(v: unknown): v is ArrayBuffer {
  return typeof ArrayBuffer !== "undefined" && v instanceof ArrayBuffer
}

async function parseNestError(err: unknown): Promise<ApiError> {
  // ✅ Zod falhou ANTES do network
  if (err instanceof ZodError) {
    const first = err.issues?.[0]?.message ?? "Erro de validação."
    return new ApiError(first, 400, err.flatten())
  }

  // ✅ Erro HTTP vindo do backend (status 4xx/5xx)
  if (err instanceof HTTPError) {
    const status = err.response.status

    let body: any = null
    try {
      body = await err.response.json()
    } catch {}

    const rawMessage = body?.message

    const message =
      Array.isArray(rawMessage)
        ? rawMessage[0]
        : typeof rawMessage === "string"
          ? rawMessage
          : status === 401
            ? "Não autorizado."
            : status === 403
              ? "Acesso negado."
              : "Erro na requisição."

    return new ApiError(String(message), status, body)
  }

  // ✅ Erro de rede/CORS/URL inválida etc.
  if (err instanceof Error) {
    const msg =
      err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError")
        ? "Falha de rede/CORS (não foi possível acessar a API)."
        : err.message

    return new ApiError(msg || "Erro inesperado.", 0, { cause: err.name })
  }

  return new ApiError("Erro inesperado.", 0)
}

async function request<TResponse>({
  method,
  url,
  body,
  opts,
}: {
  method: "get" | "post" | "patch" | "delete"
  url: string
  body?: unknown
  opts?: ApiRequestOptions<TResponse>
}): Promise<TResponse> {
  try {
    const safeBody = opts?.requestSchema ? opts.requestSchema.parse(body) : body

    // ✅ multipart/form-data
    if (isFormData(safeBody)) {
      const result = await http(url, {
        method,
        body: safeBody,
        // ⚠️ NÃO setar Content-Type manualmente (o browser coloca boundary)
      }).json<unknown>()

      return opts?.responseSchema ? opts.responseSchema.parse(result) : (result as TResponse)
    }

    // ✅ raw body (Blob/File/ArrayBuffer) — se um dia precisar
    if (isBlobLike(safeBody) || isArrayBuffer(safeBody)) {
      const result = await http(url, {
        method,
        body: safeBody as any,
      }).json<unknown>()

      return opts?.responseSchema ? opts.responseSchema.parse(result) : (result as TResponse)
    }

    // ✅ default: JSON
    const result = await http(url, {
      method,
      json: safeBody,
    }).json<unknown>()

    return opts?.responseSchema ? opts.responseSchema.parse(result) : (result as TResponse)
  } catch (err) {
    const apiError = await parseNestError(err)
    throw apiError
  }
}

export const api = {
  get: <TResponse>(
    url: string,
    responseSchema?: ZodType<TResponse>,
    opts?: ApiRequestOptions<TResponse>,
  ) =>
    request<TResponse>({
      method: "get",
      url,
      opts: { ...opts, responseSchema },
    }),

  post: <TResponse>(url: string, body?: unknown, opts?: ApiRequestOptions<TResponse>) =>
    request<TResponse>({
      method: "post",
      url,
      body,
      opts,
    }),

  patch: <TResponse>(url: string, body?: unknown, opts?: ApiRequestOptions<TResponse>) =>
    request<TResponse>({
      method: "patch",
      url,
      body,
      opts,
    }),

  delete: <TResponse>(
    url: string,
    responseSchema?: ZodType<TResponse>,
    opts?: ApiRequestOptions<TResponse>,
  ) =>
    request<TResponse>({
      method: "delete",
      url,
      opts: { ...opts, responseSchema },
    }),
}
