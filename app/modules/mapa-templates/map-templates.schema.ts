import { z } from "zod";

/**
 * Map Templates (Plantas reutilizáveis)
 * - Contrato do backend: MapTemplate + MapTemplateElement
 * - Observação: style/points são JSON no banco, então usamos z.any() com normalização no front.
 */

export const mapElementTypeSchema = z.enum([
  "BOOTH_SLOT",
  "RECT",
  "SQUARE",
  "LINE",
  "TEXT",
  "TREE",
]);

export const mapTemplateElementSchema = z.object({
  clientKey: z.string(),
  type: mapElementTypeSchema,

  x: z.number(),
  y: z.number(),
  rotation: z.number().optional().default(0),

  width: z.number().optional(),
  height: z.number().optional(),
  label: z.string().optional().nullable(),
  number: z.number().optional().nullable(),

  points: z.any().optional().nullable(), // array number[] no backend (Json)
  radius: z.number().optional().nullable(),

  style: z.any(), // Json

  isLinkable: z.boolean().optional().default(false),
});

export type MapTemplateElement = z.infer<typeof mapTemplateElementSchema>;

export const mapTemplateSchema = z.object({
  id: z.string(), 
  title: z.string(),
  description: z.string().optional().nullable(),
  backgroundUrl: z.string().optional().nullable(),
  worldWidth: z.number(),
  worldHeight: z.number(),
  version: z.number(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});

export type MapTemplate = z.infer<typeof mapTemplateSchema>;

export const mapTemplateWithElementsSchema = mapTemplateSchema.extend({
  elements: z.array(mapTemplateElementSchema),
});

export type MapTemplateWithElements = z.infer<typeof mapTemplateWithElementsSchema>;

// ---------- Inputs ----------

export const upsertMapTemplateInputSchema = z.object({
  title: z.string().min(2, "Informe um título."),
  description: z.string().optional().nullable(),
  backgroundUrl: z.string().optional().nullable(),
  worldWidth: z.number().int().min(300).max(10000).default(2000),
  worldHeight: z.number().int().min(300).max(10000).default(1200),
  elements: z.array(mapTemplateElementSchema),
});

export type UpsertMapTemplateInput = z.infer<typeof upsertMapTemplateInputSchema>;

// List
export const listMapTemplatesResponseSchema = z.object({
  items: z.array(mapTemplateSchema),
});

export type ListMapTemplatesResponse = z.infer<typeof listMapTemplatesResponseSchema>;
