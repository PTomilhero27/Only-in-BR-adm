/**
 * Erro padronizado para todas as requisições da aplicação.
 * Centralizar o formato facilita tratamento em UI e logs.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
  }
}
