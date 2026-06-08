import * as FileSystem from "expo-file-system";
import Constants from "expo-constants";
import { AppCatalog, AppSettings, CreditState, ImageAsset, SavedLook, StoredGarment, StoredModel } from "../types";

const ROOT_DIR = `${FileSystem.documentDirectory ?? ""}lookbook/`;
const MODELS_DIR = `${ROOT_DIR}models/`;
const GARMENTS_DIR = `${ROOT_DIR}garments/`;
const DATA_FILE = `${ROOT_DIR}catalog.json`;

const defaultCredits: CreditState = {
  balance: 20,
  history: [
    {
      id: "credit-welcome",
      amount: 20,
      type: "topup",
      description: "Créditos iniciais do app",
      createdAt: new Date().toISOString(),
    },
  ],
};

const embeddedExtra = (Constants.expoConfig?.extra ?? {}) as {
  stylingApiUrl?: string;
  buildVariant?: string;
};

const embeddedStylingApiUrl = embeddedExtra.stylingApiUrl ?? process.env.EXPO_PUBLIC_STYLING_API_URL ?? "";

const defaultCatalog: AppCatalog = {
  models: [],
  garments: [],
  savedLooks: [],
  credits: defaultCredits,
  settings: {
    stylingApiUrl: embeddedStylingApiUrl,
    aiProvider: "piapi",
    openAIApiKey: "",
    embeddedApiUrl: embeddedStylingApiUrl,
    buildVariant: embeddedExtra.buildVariant ?? "",
  },
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function extensionFromAsset(asset: ImageAsset) {
  if (asset.fileName?.includes(".")) {
    return asset.fileName.split(".").pop() ?? "jpg";
  }

  if (asset.mimeType === "image/png") {
    return "png";
  }

  if (asset.mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

async function ensureDirectory(path: string) {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

async function ensureBaseStructure() {
  await ensureDirectory(ROOT_DIR);
  await ensureDirectory(MODELS_DIR);
  await ensureDirectory(GARMENTS_DIR);
}

async function readCatalog(): Promise<AppCatalog> {
  await ensureBaseStructure();

  const info = await FileSystem.getInfoAsync(DATA_FILE);
  if (!info.exists) {
    await FileSystem.writeAsStringAsync(DATA_FILE, JSON.stringify(defaultCatalog, null, 2));
    return defaultCatalog;
  }

  const raw = await FileSystem.readAsStringAsync(DATA_FILE);
  const parsed = JSON.parse(raw) as Partial<AppCatalog>;

  return {
    models: parsed.models ?? [],
    garments: parsed.garments ?? [],
    savedLooks: parsed.savedLooks ?? [],
    credits: parsed.credits ?? defaultCredits,
    settings: {
      stylingApiUrl:
        parsed.settings?.stylingApiUrl?.trim() || parsed.settings?.embeddedApiUrl?.trim() || defaultCatalog.settings.stylingApiUrl,
      aiProvider: parsed.settings?.aiProvider === "openai" ? "openai" : "piapi",
      openAIApiKey: parsed.settings?.openAIApiKey?.trim() || defaultCatalog.settings.openAIApiKey,
      embeddedApiUrl: parsed.settings?.embeddedApiUrl?.trim() || defaultCatalog.settings.embeddedApiUrl,
      buildVariant: parsed.settings?.buildVariant ?? defaultCatalog.settings.buildVariant,
    },
  };
}

async function writeCatalog(catalog: AppCatalog) {
  await ensureBaseStructure();
  await FileSystem.writeAsStringAsync(DATA_FILE, JSON.stringify(catalog, null, 2));
}

async function persistImage(asset: ImageAsset, directory: string, prefix: string): Promise<ImageAsset> {
  await ensureDirectory(directory);
  const extension = extensionFromAsset(asset);
  const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const destination = `${directory}${filename}`;
  await FileSystem.copyAsync({ from: asset.uri, to: destination });

  return {
    ...asset,
    uri: destination,
    fileName: filename,
  };
}

export const localCatalogService = {
  async loadCatalog() {
    return readCatalog();
  },

  async addModels(images: ImageAsset[]) {
    const catalog = await readCatalog();
    const start = catalog.models.length;

    const newModels: StoredModel[] = [];
    for (const [index, image] of images.entries()) {
      const storedImage = await persistImage(image, MODELS_DIR, "model");
      newModels.push({
        id: makeId("model"),
        name: `Modelo ${start + index + 1}`,
        image: storedImage,
        createdAt: new Date().toISOString(),
      });
    }

    const nextCatalog = {
      ...catalog,
      models: [...newModels, ...catalog.models],
    };
    await writeCatalog(nextCatalog);
    return nextCatalog.models;
  },

  async renameModel(id: string, name: string) {
    const catalog = await readCatalog();
    const nextCatalog = {
      ...catalog,
      models: catalog.models.map((item) => (item.id === id ? { ...item, name: name.trim() || item.name } : item)),
    };
    await writeCatalog(nextCatalog);
    return nextCatalog.models;
  },

  async removeModel(id: string) {
    const catalog = await readCatalog();
    const target = catalog.models.find((item) => item.id === id);
    if (target) {
      await FileSystem.deleteAsync(target.image.uri, { idempotent: true });
    }

    const nextCatalog = {
      ...catalog,
      models: catalog.models.filter((item) => item.id !== id),
    };
    await writeCatalog(nextCatalog);
    return nextCatalog.models;
  },

  async addGarments(images: ImageAsset[]) {
    const catalog = await readCatalog();
    const start = catalog.garments.length;

    const newGarments: StoredGarment[] = [];
    for (const [index, image] of images.entries()) {
      const storedImage = await persistImage(image, GARMENTS_DIR, "garment");
      newGarments.push({
        id: makeId("garment"),
        label: `Peça ${start + index + 1}`,
        category: "top",
        image: storedImage,
        createdAt: new Date().toISOString(),
      });
    }

    const nextCatalog = {
      ...catalog,
      garments: [...newGarments, ...catalog.garments],
    };
    await writeCatalog(nextCatalog);
    return nextCatalog.garments;
  },

  async updateGarment(id: string, patch: Partial<StoredGarment>) {
    const catalog = await readCatalog();
    const nextCatalog = {
      ...catalog,
      garments: catalog.garments.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    };
    await writeCatalog(nextCatalog);
    return nextCatalog.garments;
  },

  async removeGarment(id: string) {
    const catalog = await readCatalog();
    const target = catalog.garments.find((item) => item.id === id);
    if (target) {
      await FileSystem.deleteAsync(target.image.uri, { idempotent: true });
    }

    const nextCatalog = {
      ...catalog,
      garments: catalog.garments.filter((item) => item.id !== id),
    };
    await writeCatalog(nextCatalog);
    return nextCatalog.garments;
  },

  async saveLook(look: SavedLook) {
    const catalog = await readCatalog();
    const nextCatalog = {
      ...catalog,
      savedLooks: [look, ...catalog.savedLooks],
    };
    await writeCatalog(nextCatalog);
    return nextCatalog.savedLooks;
  },

  async addCredits(amount: number, description: string) {
    const catalog = await readCatalog();
    const nextCatalog = {
      ...catalog,
      credits: {
        balance: catalog.credits.balance + amount,
        history: [
          {
            id: makeId("credit"),
            amount,
            type: "topup" as const,
            description,
            createdAt: new Date().toISOString(),
          },
          ...catalog.credits.history,
        ],
      },
    };
    await writeCatalog(nextCatalog);
    return nextCatalog.credits;
  },

  async consumeCredits(amount: number, description: string) {
    const catalog = await readCatalog();
    if (catalog.credits.balance < amount) {
      throw new Error("Você não tem créditos suficientes para esta ação.");
    }

    const nextCatalog = {
      ...catalog,
      credits: {
        balance: catalog.credits.balance - amount,
        history: [
          {
            id: makeId("credit"),
            amount: -amount,
            type: "usage" as const,
            description,
            createdAt: new Date().toISOString(),
          },
          ...catalog.credits.history,
        ],
      },
    };
    await writeCatalog(nextCatalog);
    return nextCatalog.credits;
  },

  async updateSettings(patch: Partial<AppSettings>) {
    const catalog = await readCatalog();
    const nextCatalog = {
      ...catalog,
      settings: {
        ...catalog.settings,
        ...patch,
      },
    };
    await writeCatalog(nextCatalog);
    return nextCatalog.settings;
  },
};
