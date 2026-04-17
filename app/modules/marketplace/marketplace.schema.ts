// app/modules/marketplace/marketplace.schema.ts
import { z } from "zod";
import { StallSizeSchema } from "@/app/modules/fairs/exhibitors/exhibitors.schema";

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
 * FairMapSlotTentType — configuração de preço por tipo de barraca
 */
export const fairMapSlotTentTypeSchema = z.object({
  tentType: StallSizeSchema,
  priceCents: z.number().int(),
});
export type FairMapSlotTentType = z.infer<typeof fairMapSlotTentTypeSchema>;

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
    allowedTentTypes: z.array(fairMapSlotTentTypeSchema).optional(),
    reservations: z
      .array(
        z.object({
          ownerName: z.string(),
          ownerPhone: z.string(),
          selectedTentType: StallSizeSchema.nullable().optional(),
          expiresAt: z.string().nullable().optional(),
        }),
      )
      .optional()
      .default([]),
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
    allowedTentTypes: z.array(fairMapSlotTentTypeSchema).optional(),
  })
  .passthrough();

export const marketplaceReservationLinkedStallSchema = z
  .object({
    id: z.string().optional(),
    pdvName: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    stallSize: StallSizeSchema.nullable().optional(),
    ownerName: z.string().nullable().optional(),
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

    // Novos campos (reserva capturada)
    selectedTentType: StallSizeSchema.nullable().optional(),
    priceCents: z.number().int().nullable().optional(),
    stallId: z.string().nullable().optional(),
    stall: marketplaceReservationLinkedStallSchema.nullable().optional(),
  })
  .passthrough();

export type MarketplaceReservation = z.infer<typeof marketplaceReservationSchema>;

export const listReservationsResponseSchema = z.array(marketplaceReservationSchema);

export const marketplaceReservationInstallmentInputSchema = z.object({
  number: z.number().int().min(1),
  dueDate: z.string().min(1),
  amountCents: z.number().int().min(0),
  paidAt: z.string().nullable().optional(),
  paidAmountCents: z.number().int().min(0).nullable().optional(),
});

export type MarketplaceReservationInstallmentInput = z.infer<
  typeof marketplaceReservationInstallmentInputSchema
>;

export const confirmMarketplaceReservationInputSchema = z.object({
  stallId: z.string().min(1).optional(),
  unitPriceCents: z.number().int().min(0).optional(),
  paidCents: z.number().int().min(0).optional(),
  installmentsCount: z.number().int().min(0).max(12).optional(),
  installments: z
    .array(marketplaceReservationInstallmentInputSchema)
    .optional(),
});

export type ConfirmMarketplaceReservationInput = z.infer<
  typeof confirmMarketplaceReservationInputSchema
>;

export const notifyMissingStallInputSchema = z.object({
  force: z.boolean().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type NotifyMissingStallInput = z.infer<
  typeof notifyMissingStallInputSchema
>;

export const notifyMissingStallResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type NotifyMissingStallResponse = z.infer<
  typeof notifyMissingStallResponseSchema
>;
