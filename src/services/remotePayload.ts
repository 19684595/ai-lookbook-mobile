import { GarmentPiece, ImageAsset, LookGenerationInput } from "../types";

export type RemoteImageAsset = {
  fileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  base64?: string;
  sourceUrl?: string;
};

export type RemoteGarmentPiece = {
  id: string;
  label: string;
  category: GarmentPiece["category"];
  image: RemoteImageAsset;
};

export type RemoteLookGenerationInput = {
  sessionId?: string;
  userId?: string;
  modelImage: RemoteImageAsset;
  garments: RemoteGarmentPiece[];
  styleBrief: string;
  maxLooks: number;
  renderImage?: boolean;
};

function toRemoteImage(image: ImageAsset): RemoteImageAsset {
  return {
    fileName: image.fileName,
    mimeType: image.mimeType,
    width: image.width,
    height: image.height,
    base64: image.base64,
    sourceUrl: /^https?:\/\//i.test(image.uri) ? image.uri : undefined,
  };
}

export function toRemotePayload(input: LookGenerationInput): RemoteLookGenerationInput {
  return {
    sessionId: input.sessionId,
    userId: input.userId,
    modelImage: toRemoteImage(input.modelImage),
    garments: input.garments.map((garment) => ({
      id: garment.id,
      label: garment.label,
      category: garment.category,
      image: toRemoteImage(garment.image),
    })),
    styleBrief: input.styleBrief,
    maxLooks: input.maxLooks,
    renderImage: input.renderImage,
  };
}
