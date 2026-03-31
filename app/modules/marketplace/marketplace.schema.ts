// app/modules/marketplace/marketplace.schema.ts
import { z } from "zod";

/**
 * Enums do Marketplace — espelham os enums do Prisma.
 */
export const marketplaceSlotStatusSchema = z.enum([
  "AVAILABLE",
  "RESERVED",
  "CONFIRMED",
  "BLOCKED",
]);
export type MarketplaceSlotStatus = z.infer<typeof marketplaceSlotStatusSchema>;

export const marketplaceInterestStatusSchema = z.enum([
  "NEW",
  "CONTACTED",
  "NEGOTIATING",
  "CONVERTED",
  "DISMISSED",
  "EXPIRED",
]);
export type MarketplaceInterestStatus = z.infer<typeof marketplaceInterestStatusSchema>;

export const marketplaceReservationStatusSchema = z.enum([
  "ACTIVE",
  "EXPIRED",
  "CANCELLED",
  "CONVERTED",
]);
export type MarketplaceReservationStatus = z.infer<typeof marketplaceReservationStatusSchema>;

/**
 * FairMapSlot — slot comercial no mapa (retornado em GET fairs/:fairId/map)
 */
export const fairMapSlotSchema = z
  .object({
    id: z.string(),
    fairMapElementId: z.string(),
    code: z.string().nullable().optional(),
    label: z.string().nullable().optional(),
    priceCents: z.number(),
    commercialStatus: marketplaceSlotStatusSchema,
    isPublic: z.boolean(),
    notes: z.string().nullable().optional(),
  })
  .passthrough();

export type FairMapSlot = z.infer<typeof fairMapSlotSchema>;

/**
 * Owner resumido (vem expandido nos interesses/reservas)
 */
export const marketplaceOwnerSchema = z
  .object({
    id: z.string(),
    fullName: z.string().nullable().optional(),
    document: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
  })
  .passthrough();

export type MarketplaceOwner = z.infer<typeof marketplaceOwnerSchema>;

/**
 * Slot resumido (vem expandido nos interesses/reservas)
 */
export const marketplaceSlotSummarySchema = z
  .object({
    id: z.string(),
    fairMapElementId: z.string(),
    code: z.string().nullable().optional(),
    label: z.string().nullable().optional(),
    priceCents: z.number(),
    commercialStatus: marketplaceSlotStatusSchema,
  })
  .passthrough();

/**
 * MarketplaceSlotInterest
 */
export const marketplaceInterestSchema = z
  .object({
    id: z.string(),
    fairId: z.string(),
    fairMapSlotId: z.string(),
    ownerId: z.string(),
    message: z.string().nullable().optional(),
    status: marketplaceInterestStatusSchema,
    expiresAt: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    owner: marketplaceOwnerSchema,
    fairMapSlot: marketplaceSlotSummarySchema,
  })
  .passthrough();

export type MarketplaceInterest = z.infer<typeof marketplaceInterestSchema>;

export const listInterestsResponseSchema = z.array(marketplaceInterestSchema);

/**
 * MarketplaceSlotReservation
 */
export const marketplaceReservationSchema = z
  .object({
    id: z.string(),
    fairId: z.string(),
    fairMapSlotId: z.string(),
    ownerId: z.string(),
    status: marketplaceReservationStatusSchema,
    expiresAt: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    owner: marketplaceOwnerSchema,
    fairMapSlot: marketplaceSlotSummarySchema,
  })
  .passthrough();

export type MarketplaceReservation = z.infer<typeof marketplaceReservationSchema>;

export const listReservationsResponseSchema = z.array(marketplaceReservationSchema);
