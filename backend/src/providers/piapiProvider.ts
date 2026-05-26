import { LookGenerationRequest, LookResult, RemoteGarmentPiece, RemoteImageAsset } from "../types.js";
import { CatboxTemporaryStorage } from "./catboxStorage.js";
import { CloudinaryTemporaryStorage } from "./cloudinaryStorage.js";
import { generateMockLooks } from "./mockProvider.js";
import { createPiApiTask, getPiApiTask } from "./piapiClient.js";
import { SupabaseTemporaryStorage } from "./supabaseStorage.js";

type PiApiProviderConfig = {
  apiKey?: string;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
  temporaryHost?: string;
  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
  cloudinaryFolder?: string;
  supabaseUrl?: string;
  supabaseSecretKey?: string;
  supabaseServiceRoleKey?: string;
  supabaseBucket?: string;
  supabasePathPrefix?: string;
};

type ResolvedImageReference = {
  url?: string;
  uploadedId?: string;
};

type TemporaryStorage = {
  uploadBase64Image(image: RemoteImageAsset, prefix: string): Promise<{ publicUrl: string; publicId?: string; path?: string }>;
  removeFiles(ids: string[]): Promise<void>;
};

function isHttpUrl(value?: string): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function createTemporaryStorage(config: PiApiProviderConfig): TemporaryStorage | null {
  const preferredHost = (config.temporaryHost || "").toLowerCase();

  if (preferredHost === "catbox") {
    return new CatboxTemporaryStorage();
  }

  if (preferredHost === "cloudinary" && config.cloudinaryCloudName && config.cloudinaryApiKey && config.cloudinaryApiSecret) {
    return new CloudinaryTemporaryStorage({
      cloudName: config.cloudinaryCloudName,
      apiKey: config.cloudinaryApiKey,
      apiSecret: config.cloudinaryApiSecret,
      folder: config.cloudinaryFolder,
    });
  }

  if (preferredHost === "supabase" && config.supabaseUrl && config.supabaseServiceRoleKey) {
    return new SupabaseTemporaryStorage({
      url: config.supabaseUrl,
      serviceRoleKey: config.supabaseServiceRoleKey,
      bucket: config.supabaseBucket,
      pathPrefix: config.supabasePathPrefix,
    });
  }

  if (preferredHost === "supabase" && config.supabaseUrl && config.supabaseSecretKey) {
    return new SupabaseTemporaryStorage({
      url: config.supabaseUrl,
      serviceRoleKey: config.supabaseSecretKey,
      bucket: config.supabaseBucket,
      pathPrefix: config.supabasePathPrefix,
    });
  }

  if (config.cloudinaryCloudName && config.cloudinaryApiKey && config.cloudinaryApiSecret) {
    return new CloudinaryTemporaryStorage({
      cloudName: config.cloudinaryCloudName,
      apiKey: config.cloudinaryApiKey,
      apiSecret: config.cloudinaryApiSecret,
      folder: config.cloudinaryFolder,
    });
  }

  if (config.supabaseUrl && config.supabaseServiceRoleKey) {
    return new SupabaseTemporaryStorage({
      url: config.supabaseUrl,
      serviceRoleKey: config.supabaseServiceRoleKey,
      bucket: config.supabaseBucket,
      pathPrefix: config.supabasePathPrefix,
    });
  }

  if (config.supabaseUrl && config.supabaseSecretKey) {
    return new SupabaseTemporaryStorage({
      url: config.supabaseUrl,
      serviceRoleKey: config.supabaseSecretKey,
      bucket: config.supabaseBucket,
      pathPrefix: config.supabasePathPrefix,
    });
  }

  if (preferredHost === "catbox" || !preferredHost) {
    return new CatboxTemporaryStorage();
  }

  return null;
}

async function resolveImageReference(
  storage: TemporaryStorage | null,
  image: RemoteImageAsset,
  prefix: string,
): Promise<ResolvedImageReference> {
  if (isHttpUrl(image.sourceUrl)) {
    return { url: image.sourceUrl };
  }

  if (storage && image.base64) {
    const uploaded = await storage.uploadBase64Image(image, prefix);
    return {
      url: uploaded.publicUrl,
      uploadedId: uploaded.publicId || uploaded.path,
    };
  }

  return {};
}

function selectTryOnInputs(modelImageUrl: string, pieces: Array<RemoteGarmentPiece & { resolvedUrl?: string }>) {
  const dress = pieces.find((piece) => piece.category === "dress" && isHttpUrl(piece.resolvedUrl));
  if (dress?.resolvedUrl) {
    return {
      model_input: modelImageUrl,
      dress_input: dress.resolvedUrl,
    };
  }

  const upper = pieces.find((piece) => piece.category === "top" && isHttpUrl(piece.resolvedUrl));
  const lower = pieces.find((piece) => piece.category === "bottom" && isHttpUrl(piece.resolvedUrl));

  if (!upper?.resolvedUrl && !lower?.resolvedUrl) {
    return null;
  }

  return {
    model_input: modelImageUrl,
    ...(upper?.resolvedUrl ? { upper_input: upper.resolvedUrl } : {}),
    ...(lower?.resolvedUrl ? { lower_input: lower.resolvedUrl } : {}),
  };
}

function extractPreviewUrl(task: Awaited<ReturnType<typeof getPiApiTask>>) {
  const output = task.data?.output;
  return (
    output?.image_url ||
    output?.image_urls?.[0] ||
    output?.works?.[0]?.image?.resource_without_watermark ||
    output?.works?.[0]?.image?.resource ||
    output?.works?.[0]?.cover?.resource_without_watermark ||
    output?.works?.[0]?.cover?.resource
  );
}

async function waitForPiApiImage(
  apiKey: string,
  taskId: string,
  config: Required<Pick<PiApiProviderConfig, "pollIntervalMs" | "maxPollAttempts">>,
) {
  for (let attempt = 0; attempt < config.maxPollAttempts; attempt += 1) {
    const task = await getPiApiTask(apiKey, taskId);
    const status = task.data?.status;

    if (status === "completed") {
      const previewUrl = extractPreviewUrl(task);
      if (!previewUrl) {
        throw new Error("PiAPI concluiu a tarefa, mas nao retornou image_url.");
      }
      return previewUrl;
    }

    if (status === "failed") {
      const message =
        task.data?.error?.raw_message ||
        task.data?.error?.message ||
        task.message ||
        "Tarefa falhou na PiAPI.";
      throw new Error(message);
    }

    await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
  }

  throw new Error("A PiAPI nao concluiu a tarefa no tempo esperado.");
}

export async function generatePiApiLooks(input: LookGenerationRequest, config: PiApiProviderConfig): Promise<LookResult[]> {
  if (!config.apiKey) {
    throw new Error("PIAPI_API_KEY nao configurada no backend.");
  }
  const apiKey = config.apiKey;

  const storage = createTemporaryStorage(config);
  const uploadedIds: string[] = [];

  try {
    const modelReference = await resolveImageReference(storage, input.modelImage, "model");
    if (!modelReference.url) {
      throw new Error(
        "A integracao com PiAPI precisa de modelImage.sourceUrl publica ou de Cloudinary/Supabase configurados para upload temporario.",
      );
    }
    if (modelReference.uploadedId) {
      uploadedIds.push(modelReference.uploadedId);
    }

    const resolvedPieces = await Promise.all(
      input.garments.map(async (piece) => {
        const reference = await resolveImageReference(storage, piece.image, piece.category);
        if (reference.uploadedId) {
          uploadedIds.push(reference.uploadedId);
        }

        return {
          ...piece,
          resolvedUrl: reference.url,
        };
      }),
    );

    const baseLooks = await generateMockLooks({
      ...input,
      garments: resolvedPieces.map(({ resolvedUrl, ...piece }) => ({
        ...piece,
        image: {
          ...piece.image,
          sourceUrl: resolvedUrl || piece.image.sourceUrl,
        },
      })),
    });

    const pollConfig = {
      pollIntervalMs: config.pollIntervalMs ?? 4000,
      maxPollAttempts: config.maxPollAttempts ?? 30,
    };

    return Promise.all(
      baseLooks.map(async (look) => {
        const resolvedLookPieces = look.pieces.map((piece) => {
          const source = resolvedPieces.find((item) => item.id === piece.id);
          return {
            ...piece,
            resolvedUrl: source?.resolvedUrl,
          };
        });

        const tryOnInput = selectTryOnInputs(modelReference.url!, resolvedLookPieces);
        if (!tryOnInput) {
          return {
            ...look,
            summary: `${look.summary} Nenhuma combinacao compativel com upper/lower ou dress foi encontrada para envio a PiAPI.`,
          };
        }

        const createdTask = await createPiApiTask(apiKey, {
          model: "kling",
          task_type: "ai_try_on",
          input: {
            ...tryOnInput,
            batch_size: 1,
          },
          config: {
            service_mode: "public",
          },
        });

        const taskId = createdTask.data?.task_id;
        if (!taskId) {
          throw new Error("A PiAPI nao retornou task_id.");
        }

        const previewUri = await waitForPiApiImage(apiKey, taskId, pollConfig);

        return {
          ...look,
          previewUri,
          summary: `${look.summary} Preview gerado pela PiAPI/Kling Virtual Try-On.`,
        };
      }),
    );
  } finally {
    if (storage) {
      await storage.removeFiles(uploadedIds);
    }
  }
}
