import { ApiError } from "@/app/shared/http/errors";

export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Erro inesperado";
}
