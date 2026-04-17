// app/modules/fair-showcase/showcase.service.ts
import { api } from "@/app/shared/http/api";
import {
  listShowcasesResponseSchema,
  showcaseResponseSchema,
  uploadImageResponseSchema,
  type CreateShowcaseRequest,
  type Showcase,
  type UpdateShowcaseRequest,
  type UploadImageResponse,
} from "./showcase.schema";

/**
 * Service do módulo Fair Showcase (admin).
 *
 * Responsabilidade:
 * - Centralizar chamadas HTTP para CRUD da vitrine.
 * - Parsing/validação com Zod nos responses.
 * - Upload de imagem via multipart/form-data.
 */
export const showcaseService = {
  /**
   * GET /fair-showcase — listar todas as vitrines
   */
  async list(): Promise<Showcase[]> {
    return api.get("fair-showcase", listShowcasesResponseSchema);
  },

  /**
   * GET /fair-showcase/:fairId — buscar vitrine de uma feira
   * Retorna null se não existir (backend retorna null/204).
   */
  async getByFairId(fairId: string): Promise<Showcase | null> {
    const data = await api.get(`fair-showcase/${fairId}`);
    if (!data) return null;
    return showcaseResponseSchema.parse(data);
  },

  /**
   * POST /fair-showcase/:fairId — criar vitrine
   */
  async create(
    fairId: string,
    payload: CreateShowcaseRequest,
  ): Promise<Showcase> {
    const data = await api.post(`fair-showcase/${fairId}`, payload);
    return showcaseResponseSchema.parse(data);
  },

  /**
   * PATCH /fair-showcase/:fairId — atualizar vitrine (parcial)
   */
  async update(
    fairId: string,
    payload: UpdateShowcaseRequest,
  ): Promise<Showcase> {
    const data = await api.patch(`fair-showcase/${fairId}`, payload);
    return showcaseResponseSchema.parse(data);
  },

  /**
   * DELETE /fair-showcase/:fairId — remover vitrine
   */
  async remove(fairId: string): Promise<{ deleted: boolean }> {
    return api.delete(`fair-showcase/${fairId}`);
  },

  /**
   * PATCH /fair-showcase/:fairId/publish — publicar
   */
  async publish(fairId: string): Promise<Showcase> {
    const data = await api.patch(`fair-showcase/${fairId}/publish`);
    return showcaseResponseSchema.parse(data);
  },

  /**
   * PATCH /fair-showcase/:fairId/unpublish — despublicar
   */
  async unpublish(fairId: string): Promise<Showcase> {
    const data = await api.patch(`fair-showcase/${fairId}/unpublish`);
    return showcaseResponseSchema.parse(data);
  },

  /**
   * POST /fair-showcase/:fairId/upload — upload de imagem (FormData)
   */
  async uploadImage(
    fairId: string,
    file: File,
  ): Promise<UploadImageResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const data = await api.post(`fair-showcase/${fairId}/upload`, formData);
    return uploadImageResponseSchema.parse(data);
  },
};
