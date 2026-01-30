/**
 * Hook TanStack Query para listagem de feiras.
 *
 * Responsabilidades:
 * - Centralizar cache e refetch de feiras
 * - Permitir filtro por status sem duplicar lógica no front
 *
 * Decisão:
 * - queryKey inclui status para cache separado
 * - evita "filtrar tudo no client" em telas simples (dashboard)
 */

import { useQuery } from "@tanstack/react-query";
import { listFairs } from "../fairs.service";
import { FairStatus } from "../types";

export function useFairsQuery(params?: { status?: FairStatus }) {
  const statusKey = params?.status ?? "ALL";
  return useQuery({
    queryKey: ["fairs", statusKey],
    queryFn: () => listFairs(params),
  });
}
