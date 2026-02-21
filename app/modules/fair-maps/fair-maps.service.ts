// src/modules/fair-maps/fair-maps.service.ts
import { api } from "@/app/shared/http/api";
import {
  getFairMapResponseSchema,
  linkBoothSlotInputSchema,
  setFairMapTemplateInputSchema,
  listAvailableStallFairsResponseSchema,
  type GetFairMapResponse,
  type LinkBoothSlotInput,
  type SetFairMapTemplateInput,
  type AvailableStallFair,
} from "./fair-maps.schema";

export const fairMapsService = {
  async getByFairId(fairId: string): Promise<GetFairMapResponse> {
    return api.get(
      `fairs/${fairId}/map`,
      getFairMapResponseSchema,
    );
  },

  async setTemplate(
    fairId: string,
    input: SetFairMapTemplateInput,
  ): Promise<GetFairMapResponse> {
    const payload = setFairMapTemplateInputSchema.parse(input);

    return api.put(
      `fairs/${fairId}/map`,
      payload,
      { responseSchema: getFairMapResponseSchema },
    );
  },

  async linkSlot(
    fairId: string,
    slotClientKey: string,
    input: LinkBoothSlotInput,
  ): Promise<GetFairMapResponse> {
    const payload = linkBoothSlotInputSchema.parse(input);

    return api.patch(
      `fairs/${fairId}/map/slots/${slotClientKey}/link`,
      payload,
      { responseSchema: getFairMapResponseSchema },
    );
  },

  /**
   * ✅ Novo endpoint
   * GET /fairs/:fairId/map/available-stall-fairs
   */
  async listAvailableStallFairs(
    fairId: string,
  ): Promise<AvailableStallFair[]> {
    return api.get(
      `fairs/${fairId}/map/available-stall-fairs`,
      listAvailableStallFairsResponseSchema,
    );
  },
};