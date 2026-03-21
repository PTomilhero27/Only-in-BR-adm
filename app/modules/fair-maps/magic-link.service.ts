import { api } from "@/app/shared/http/api";
import {
  validateMagicLinkInputSchema,
  validateMagicLinkResponseSchema,
  createMagicLinkResponseSchema,
  type ValidateMagicLinkInput,
  type ValidateMagicLinkResponse,
  type CreateMagicLinkResponse,
} from "./magic-link.schema";

export const magicLinkService = {
  async validate(
    code: string,
    input: ValidateMagicLinkInput
  ): Promise<ValidateMagicLinkResponse> {
    const payload = validateMagicLinkInputSchema.parse(input);

    return api.post(
      `magic-links/${code}/validate`,
      payload,
      { responseSchema: validateMagicLinkResponseSchema },
    );
  },

  async create(fairId: string): Promise<CreateMagicLinkResponse> {
    // A rota exata depende do backend, estamos assumindo `/feiras/:id/magic-links` ou similar
    // Ajustar se a API for diferente.
    return api.post(
      `feiras/${fairId}/magic-links`,
      {},
      { responseSchema: createMagicLinkResponseSchema },
    );
  },
};
