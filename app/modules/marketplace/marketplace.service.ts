// app/modules/marketplace/marketplace.service.ts
import { api } from "@/app/shared/http/api";
import {
  listInterestsResponseSchema,
  listReservationsResponseSchema,
  type MarketplaceInterest,
  type MarketplaceInterestStatus,
  type MarketplaceReservation,
  type MarketplaceSlotStatus,
} from "./marketplace.schema";

export const marketplaceService = {
  /**
   * PATCH admin/marketplace/slots/:slotId/price
   */
  async updateSlotPrice(slotId: string, priceCents: number) {
    return api.patch(`admin/marketplace/slots/${slotId}/price`, { priceCents });
  },

  /**
   * PATCH admin/marketplace/slots/:slotId/status
   */
  async updateSlotStatus(slotId: string, status: MarketplaceSlotStatus) {
    return api.patch(`admin/marketplace/slots/${slotId}/status`, { status });
  },

  /**
   * POST admin/marketplace/slots/:slotId/block
   */
  async blockSlot(slotId: string) {
    return api.post(`admin/marketplace/slots/${slotId}/block`);
  },

  /**
   * POST admin/marketplace/slots/:slotId/unblock
   */
  async unblockSlot(slotId: string) {
    return api.post(`admin/marketplace/slots/${slotId}/unblock`);
  },

  /**
   * GET admin/marketplace/fairs/:fairId/interests
   */
  async listInterests(fairId: string): Promise<MarketplaceInterest[]> {
    return api.get(
      `admin/marketplace/fairs/${fairId}/interests`,
      listInterestsResponseSchema,
    );
  },

  /**
   * GET admin/marketplace/fairs/:fairId/reservations
   */
  async listReservations(fairId: string): Promise<MarketplaceReservation[]> {
    return api.get(
      `admin/marketplace/fairs/${fairId}/reservations`,
      listReservationsResponseSchema,
    );
  },

  /**
   * PATCH admin/marketplace/interests/:id/status-and-expiration
   */
  async updateInterestStatus(
    interestId: string,
    status: MarketplaceInterestStatus,
    expiresAt?: string | null,
  ) {
    return api.patch(
      `admin/marketplace/interests/${interestId}/status-and-expiration`,
      { status, expiresAt: expiresAt ?? undefined },
    );
  },
};
