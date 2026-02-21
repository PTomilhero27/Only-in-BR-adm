/**
 * Wrapper genérico para GET/POST/PATCH/DELETE.
 * - Centraliza parsing de erro do Nest
 * - Permite validação com Zod (request/response)
 * - ✅ Suporta multipart/form-data (FormData) e body raw (Blob/File)
 * - ✅ Suporta respostas não-JSON (Blob / text / arrayBuffer)
 * - ✅ Permite controlar cache (ex.: no-store para evitar 304)
 */

import { HTTPError } from "ky";
import { ZodError, ZodType } from "zod";
import { http } from "./client";
import { ApiError } from "./errors";

type ApiResponseType = "json" | "blob" | "text" | "arrayBuffer";

type ApiRequestOptions<TResponse> = {
  /**
   * Schema opcional para validar/normalizar o request antes de enviar.
   */
  requestSchema?: ZodType<any>;

  /**
   * Schema opcional para validar a resposta (somente quando responseType = "json").
   */
  responseSchema?: ZodType<TResponse>;

  /**
   * ✅ Como interpretar a resposta.
   * - "json" (default): usa .json()
   * - "blob": usa .blob() (ex.: download xlsx/pdf)
   * - "text": usa .text()
   * - "arrayBuffer": usa .arrayBuffer()
   */
  responseType?: ApiResponseType;

  /**
   * ✅ Controle de cache do fetch.
   * Útil para endpoints que não devem retornar 304.
   */
  cache?: RequestCache;
};

function isFormData(v: unknown): v is FormData {
  return typeof FormData !== "undefined" && v instanceof FormData;
}

function isBlobLike(v: unknown): v is Blob {
  return typeof Blob !== "undefined" && v instanceof Blob;
}

function isArrayBuffer(v: unknown): v is ArrayBuffer {
  return typeof ArrayBuffer !== "undefined" && v instanceof ArrayBuffer;
}

async function parseNestError(err: unknown): Promise<ApiError> {
  // ✅ Zod falhou ANTES do network
  if (err instanceof ZodError) {
    const first = err.issues?.[0]?.message ?? "Erro de validação.";
    return new ApiError(first, 400, err.flatten());
  }

  // ✅ Erro HTTP vindo do backend (status 4xx/5xx)
  if (err instanceof HTTPError) {
    const status = err.response.status;

    let body: any = null;
    try {
      body = await err.response.json();
    } catch {}

    const rawMessage = body?.message;

    const message = Array.isArray(rawMessage)
      ? rawMessage[0]
      : typeof rawMessage === "string"
        ? rawMessage
        : status === 401
          ? "Não autorizado."
          : status === 403
            ? "Acesso negado."
            : "Erro na requisição.";

    return new ApiError(String(message), status, body);
  }

  // ✅ Erro de rede/CORS/URL inválida etc.
  if (err instanceof Error) {
    const msg =
      err.message?.includes("Failed to fetch") ||
      err.message?.includes("NetworkError")
        ? "Falha de rede/CORS (não foi possível acessar a API)."
        : err.message;

    return new ApiError(msg || "Erro inesperado.", 0, { cause: err.name });
  }

  return new ApiError("Erro inesperado.", 0);
}

/**
 * ✅ Interpreta a resposta conforme responseType.
 * Importante:
 * - Só aplicamos responseSchema quando o retorno é JSON.
 */
async function parseResponse<TResponse>(
  resp: any,
  opts?: ApiRequestOptions<TResponse>,
): Promise<TResponse> {
  const responseType: ApiResponseType = opts?.responseType ?? "json";

  if (responseType === "blob") {
    // ky ResponsePromise tem .blob()
    return (await resp.blob()) as TResponse;
  }

  if (responseType === "text") {
    return (await resp.text()) as TResponse;
  }

  if (responseType === "arrayBuffer") {
    return (await resp.arrayBuffer()) as TResponse;
  }

  // default: json
  const result = await (resp as Response).json();
  return opts?.responseSchema
    ? opts.responseSchema.parse(result)
    : (result as TResponse);
}

async function request<TResponse>({
  method,
  url,
  body,
  opts,
}: {
  method: "get" | "post" | "put" | "patch" | "delete";
  url: string;
  body?: unknown;
  opts?: ApiRequestOptions<TResponse>;
}): Promise<TResponse> {
  try {
    const safeBody = opts?.requestSchema
      ? opts.requestSchema.parse(body)
      : body;

    // ✅ Base options comuns (cache, etc)
    const baseOptions: any = {
      method,
      ...(opts?.cache ? { cache: opts.cache } : {}),
    };

    // ✅ multipart/form-data
    if (isFormData(safeBody)) {
      const resp = http(url, {
        ...baseOptions,
        body: safeBody,
        // ⚠️ NÃO setar Content-Type manualmente (o browser coloca boundary)
      });

      return await parseResponse<TResponse>(resp, opts);
    }

    // ✅ raw body (Blob/File/ArrayBuffer)
    if (isBlobLike(safeBody) || isArrayBuffer(safeBody)) {
      const resp = http(url, {
        ...baseOptions,
        body: safeBody as any,
      });

      return await parseResponse<TResponse>(resp, opts);
    }

    // ✅ default: JSON
    const resp = http(url, {
      ...baseOptions,
      json: safeBody,
    });

    return await parseResponse<TResponse>(resp, opts);
  } catch (err) {
    const apiError = await parseNestError(err);
    throw apiError;
  }
}

export const api = {
  /**
   * GET genérico
   * Padrão:
   * - se passar responseSchema => valida com Zod
   * - responseType default = "json"
   */
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

  /**
   * POST genérico
   */
  post: <TResponse>(
    url: string,
    body?: unknown,
    opts?: ApiRequestOptions<TResponse>,
  ) =>
    request<TResponse>({
      method: "post",
      url,
      body,
      opts,
    }),

  /**
   * PATCH genérico
   */
  patch: <TResponse>(
    url: string,
    body?: unknown,
    opts?: ApiRequestOptions<TResponse>,
  ) =>
    request<TResponse>({
      method: "patch",
      url,
      body,
      opts,
    }),

  put: <TResponse>(
    url: string,
    body?: unknown,
    opts?: ApiRequestOptions<TResponse>,
  ) =>
    request<TResponse>({
      method: "put",
      url,
      body,
      opts,
    }),

  /**
   * DELETE genérico
   */
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
};
