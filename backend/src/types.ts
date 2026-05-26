export type RemoteImageAsset = {
  fileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  base64?: string;
  sourceUrl?: string;
};

export type GarmentCategory = "top" | "bottom" | "dress" | "shoes" | "accessory";

export type RemoteGarmentPiece = {
  id: string;
  label: string;
  category: GarmentCategory;
  image: RemoteImageAsset;
};

export type LookGenerationRequest = {
  sessionId?: string;
  userId?: string;
  modelImage: RemoteImageAsset;
  garments: RemoteGarmentPiece[];
  styleBrief: string;
  maxLooks: number;
};

export type LookResult = {
  id: string;
  title: string;
  summary: string;
  pieces: RemoteGarmentPiece[];
  prompt: string;
  previewUri?: string;
};

export type LookSuggestion = {
  title: string;
  summary: string;
  pieceIds: string[];
  prompt: string;
};

export type LookHistoryEntry = {
  id: string;
  sessionId: string;
  userId?: string;
  provider: string;
  createdAt: string;
  request: {
    styleBrief: string;
    maxLooks: number;
    garmentCount: number;
  };
  looks: LookResult[];
};

export type UserProfile = {
  userId: string;
  displayName: string;
  email: string;
  createdAt: string;
};
