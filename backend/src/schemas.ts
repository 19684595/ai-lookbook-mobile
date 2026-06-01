import { z } from "zod";

const remoteImageAssetSchema = z.object({
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  base64: z.string().min(1).optional(),
  sourceUrl: z.string().url().optional(),
});

const remoteGarmentPieceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  category: z.enum(["top", "bottom", "dress", "shoes", "accessory"]),
  image: remoteImageAssetSchema,
});

export const lookGenerationRequestSchema = z.object({
  sessionId: z.string().min(1).max(120).optional(),
  userId: z.string().min(1).max(120).optional(),
  modelImage: remoteImageAssetSchema.extend({
    base64: z.string().min(1),
  }),
  garments: z.array(remoteGarmentPieceSchema).min(1),
  styleBrief: z.string().default(""),
  maxLooks: z.number().int().min(1).max(8),
  renderImage: z.boolean().default(true),
});

export const userProfileSchema = z.object({
  displayName: z.string().min(2).max(120),
  email: z.string().email().max(180),
});

export const favoriteToggleSchema = z.object({
  userId: z.string().min(1).max(120),
  historyId: z.string().min(1).max(180),
});
