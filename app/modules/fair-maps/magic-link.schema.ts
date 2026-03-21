import { z } from "zod";
import { getFairMapResponseSchema } from "./fair-maps.schema";

export const validateMagicLinkInputSchema = z.object({
  pin: z.string().min(1, "O PIN é obrigatório"),
});

export type ValidateMagicLinkInput = z.infer<typeof validateMagicLinkInputSchema>;

export const validateMagicLinkResponseSchema = z.object({
  fairMap: getFairMapResponseSchema,
  token: z.string().optional(), // Opcional, dependendo de como o backend retorna
}).passthrough();

export type ValidateMagicLinkResponse = z.infer<typeof validateMagicLinkResponseSchema>;

// -- Geração do Link Mágico --

export const createMagicLinkResponseSchema = z.object({
  magicLink: z.object({
    id: z.string().optional(),
    code: z.string(),
    pin: z.string(),
    expiresAt: z.string().optional(),
    url: z.string().optional(),
  }),
}).passthrough();

export type CreateMagicLinkResponse = z.infer<typeof createMagicLinkResponseSchema>;
