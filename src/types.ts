export type ImageAsset = {
  uri: string;
  width?: number;
  height?: number;
  fileName?: string;
  mimeType?: string;
  base64?: string;
};

export type GarmentCategory = "top" | "bottom" | "dress" | "shoes" | "accessory";

export type GarmentPiece = {
  id: string;
  label: string;
  category: GarmentCategory;
  image: ImageAsset;
};

export type StoredModel = {
  id: string;
  name: string;
  image: ImageAsset;
  createdAt: string;
};

export type StoredGarment = GarmentPiece & {
  createdAt: string;
};

export type SuggestedEnvironment = "Passarela" | "Balada" | "Rua" | "Shopping";

export type SavedLook = {
  id: string;
  name: string;
  mode: "manual" | "suggested";
  createdAt: string;
  modelId?: string;
  modelName: string;
  summary: string;
  trendComment?: string;
  prompt: string;
  previewUri?: string;
  renderedImage: boolean;
  environment?: SuggestedEnvironment;
  pieces: Array<{
    id: string;
    label: string;
    category: GarmentCategory;
  }>;
};

export type CreditTransaction = {
  id: string;
  amount: number;
  type: "topup" | "usage";
  description: string;
  createdAt: string;
};

export type CreditState = {
  balance: number;
  history: CreditTransaction[];
};

export type AppSettings = {
  stylingApiUrl: string;
  openAIApiKey?: string;
  embeddedApiUrl?: string;
  buildVariant?: string;
};

export type AppCatalog = {
  models: StoredModel[];
  garments: StoredGarment[];
  savedLooks: SavedLook[];
  credits: CreditState;
  settings: AppSettings;
};

export type LookGenerationInput = {
  sessionId?: string;
  userId?: string;
  modelImage: ImageAsset;
  garments: GarmentPiece[];
  styleBrief: string;
  maxLooks: number;
  renderImage?: boolean;
};

export type LookResult = {
  id: string;
  title: string;
  summary: string;
  trendComment?: string;
  pieces: GarmentPiece[];
  prompt: string;
  previewUri?: string;
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
  createdAt?: string;
};
