import { api } from "@/app/shared/http/api";
import {
  listMapTemplatesResponseSchema,
  mapTemplateWithElementsSchema,
  upsertMapTemplateInputSchema,
  type ListMapTemplatesResponse,
  type MapTemplateWithElements,
  type UpsertMapTemplateInput,
} from "./map-templates.schema";

/**
 * MapTemplatesService
 *
 * Responsabilidade:
 * - Centralizar chamadas HTTP para CRUD de plantas reutilizáveis.
 * - Garantir validação/parse via Zod (input e output).
 *
 * Decisão importante (ky + prefixUrl):
 * - NÃO usar URL iniciando com "/" (ex.: "/map-templates"),
 *   pois o ky com prefixUrl lança erro.
 */
export const mapTemplatesService = {
  /**
   * Lista templates (plantas).
   * Backend retorna array: MapTemplateResponseDto[]
   * No front, normalizamos para { items } para manter padrão futuro (paginação).
   */
  async list(): Promise<ListMapTemplatesResponse> {
    const res = await api.get<any>("map-templates", undefined, { cache: "no-store" });

    // ✅ Backend: []  | Futuro: { items: [] }
    const normalized = Array.isArray(res) ? { items: res } : res;

    return listMapTemplatesResponseSchema.parse(normalized);
  },

  /**
   * Detalhe do template (inclui elements).
   */
  async getById(templateId: string): Promise<MapTemplateWithElements> {
    return api.get(`map-templates/${templateId}`, mapTemplateWithElementsSchema, {
      cache: "no-store",
    });
  },

  /**
   * Cria template.
   */
  async create(input: UpsertMapTemplateInput): Promise<MapTemplateWithElements> {
    const payload = upsertMapTemplateInputSchema.parse(input);

    return api.post(`map-templates`, payload, {
      responseSchema: mapTemplateWithElementsSchema,
    });
  },

  /**
   * Atualiza template (backend usa PUT).
   */
  async update(templateId: string, input: UpsertMapTemplateInput): Promise<MapTemplateWithElements> {
    const payload = upsertMapTemplateInputSchema.parse(input);

    return api.put(`map-templates/${templateId}`, payload, {
      responseSchema: mapTemplateWithElementsSchema,
    });
  },

  /**
   * Remove template.
   */
  async remove(templateId: string): Promise<void> {
    await api.delete(`map-templates/${templateId}`);
  },
};