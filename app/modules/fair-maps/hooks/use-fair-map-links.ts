// src/modules/fair-maps/hooks/use-fair-map-links.ts
/**
 * Hook utilitário para derivar estruturas rápidas a partir da resposta do mapa.
 * Responsabilidade:
 * - Facilitar lookup de link por slotClientKey
 * - Facilitar verificação se um slot está vinculado
 */

import { useMemo } from "react";
import type { GetFairMapResponse } from "../fair-maps.schema";

export function useFairMapLinks(data?: GetFairMapResponse | null) {
  return useMemo(() => {
    const links = data?.links ?? [];

    const linksBySlotClientKey = new Map<string, (typeof links)[number]>();
    const linkedStallFairIds = new Set<string>();

    for (const link of links) {
      linksBySlotClientKey.set(link.slotClientKey, link);
      linkedStallFairIds.add(link.stallFairId);
    }

    return { linksBySlotClientKey, linkedStallFairIds };
  }, [data]);
}
