// src/modules/fair-maps/fair-maps.schema.ts
import { z } from "zod";

/**
 * Tipos possíveis de elementos do mapa.
 */
export const mapElementTypeSchema = z.enum([
  "BOOTH_SLOT",
  "RECT",
  "SQUARE",
  "LINE",
  "TEXT",
  "TREE",
]);

export type MapElementType = z.infer<typeof mapElementTypeSchema>;

/**
 * Elemento do template (conforme FairMapTemplateElementDto)
 */
export const fairMapTemplateElementSchema = z
  .object({
    clientKey: z.string(),
    type: mapElementTypeSchema,

    x: z.number(),
    y: z.number(),
    rotation: z.number(),

    width: z.number().nullable().optional(),
    height: z.number().nullable().optional(),

    label: z.string().nullable().optional(),
    number: z.number().nullable().optional(),

    points: z.array(z.number()).nullable().optional(),
    radius: z.number().nullable().optional(),

    style: z.unknown(),
    isLinkable: z.boolean(),
  })
  .passthrough();

export type FairMapTemplateElement = z.infer<
  typeof fairMapTemplateElementSchema
>;

/**
 * Template aplicado à feira
 */
export const fairMapTemplateSchema = z
  .object({
    id: z.string(),
    title: z.string(),

    backgroundUrl: z.string().nullable().optional(),

    worldWidth: z.number(),
    worldHeight: z.number(),

    version: z.number(),

    elements: z.array(fairMapTemplateElementSchema),
  })
  .passthrough();

export type FairMapTemplate = z.infer<typeof fairMapTemplateSchema>;

/**
 * StallFair resumida (vínculo expandido)
 */
export const fairMapLinkedStallFairSchema = z
  .object({
    id: z.string(),
    stallPdvName: z.string(),
    stallSize: z.string(),
    ownerName: z.string(),
    ownerPhone: z.string().nullable().optional(),
  })
  .passthrough();

export type FairMapLinkedStallFair = z.infer<
  typeof fairMapLinkedStallFairSchema
>;

/**
 * Link slot → StallFair
 */
export const fairMapBoothLinkSchema = z
  .object({
    slotClientKey: z.string(),
    stallFairId: z.string(),
    stallFair: fairMapLinkedStallFairSchema.nullable().optional(),
  })
  .passthrough();

export type FairMapBoothLink = z.infer<
  typeof fairMapBoothLinkSchema
>;

/**
 * ✅ NOVA resposta real do backend
 * GET /fairs/:fairId/map
 */
export const getFairMapResponseSchema = z
  .object({
    fairId: z.string(),
    fairMapId: z.string(),
    template: fairMapTemplateSchema,
    links: z.array(fairMapBoothLinkSchema),
  })
  .passthrough();

export type GetFairMapResponse = z.infer<
  typeof getFairMapResponseSchema
>;

/**
 * PUT /fairs/:fairId/map
 */
export const setFairMapTemplateInputSchema = z.object({
  templateId: z.string().min(1),
});

export type SetFairMapTemplateInput = z.infer<
  typeof setFairMapTemplateInputSchema
>;

/**
 * PATCH /fairs/:fairId/map/slots/:slotClientKey/link
 */
export const linkBoothSlotInputSchema = z.object({
  stallFairId: z.string().nullable(),
});

export type LinkBoothSlotInput = z.infer<
  typeof linkBoothSlotInputSchema
>;

/**
 * GET /fairs/:fairId/map/available-stall-fairs
 */
export const availableStallFairSchema = z
  .object({
    id: z.string(),
    stallPdvName: z.string(),
    stallSize: z.string(),
    ownerName: z.string(),
    ownerPhone: z.string().nullable().optional(),
  })
  .passthrough();

export type AvailableStallFair = z.infer<
  typeof availableStallFairSchema
>;

export const listAvailableStallFairsResponseSchema = z.array(
  availableStallFairSchema,
);