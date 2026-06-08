import "dotenv/config";
import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { favoriteToggleSchema, lookGenerationRequestSchema, userProfileSchema } from "./schemas.js";
import { FavoriteRepository } from "./services/favoriteRepository.js";
import { HistoryRepository } from "./services/historyRepository.js";
import { LookService, ServiceConfig } from "./services/lookService.js";
import { UserRepository } from "./services/userRepository.js";

type ServerConfig = {
  provider?: string;
  dataDir?: string;
  openAIApiKey?: string;
  openAITextModel?: string;
  openAIImageModel?: string;
  openAIRenderImages?: boolean;
  piapiApiKey?: string;
  piapiPollIntervalMs?: number;
  piapiMaxPollAttempts?: number;
  piapiTemporaryHost?: string;
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

function extractHeaderValue(request: express.Request, name: string) {
  const value = request.header(name)?.trim();
  return value || undefined;
}

export function createApp(config: ServerConfig = {}) {
  const app = express();
  const provider =
    config.provider ||
    process.env.LOOKBOOK_PROVIDER ||
    (process.env.PIAPI_API_KEY ? "piapi" : process.env.OPENAI_API_KEY ? "openai" : "mock");
  const dataDir = config.dataDir || process.env.DATA_DIR || path.resolve(process.cwd(), "data");
  const historyRepository = new HistoryRepository(
    path.resolve(dataDir, "look-history.json"),
  );
  const userRepository = new UserRepository(
    path.resolve(dataDir, "users.json"),
  );
  const favoriteRepository = new FavoriteRepository(
    path.resolve(dataDir, "favorites.json"),
  );

  const baseLookServiceConfig: ServiceConfig = {
    provider,
    openAIApiKey: config.openAIApiKey || process.env.OPENAI_API_KEY,
    openAITextModel: config.openAITextModel || process.env.OPENAI_TEXT_MODEL,
    openAIImageModel: config.openAIImageModel || process.env.OPENAI_IMAGE_MODEL,
    openAIRenderImages: config.openAIRenderImages ?? process.env.OPENAI_RENDER_IMAGES !== "false",
    piapiApiKey: config.piapiApiKey || process.env.PIAPI_API_KEY,
    piapiPollIntervalMs: config.piapiPollIntervalMs ?? Number.parseInt(process.env.PIAPI_POLL_INTERVAL_MS || "4000", 10),
    piapiMaxPollAttempts: config.piapiMaxPollAttempts ?? Number.parseInt(process.env.PIAPI_MAX_POLL_ATTEMPTS || "30", 10),
    piapiTemporaryHost: config.piapiTemporaryHost || process.env.PIAPI_TEMPORARY_HOST,
    cloudinaryCloudName: config.cloudinaryCloudName || process.env.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: config.cloudinaryApiKey || process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret: config.cloudinaryApiSecret || process.env.CLOUDINARY_API_SECRET,
    cloudinaryFolder: config.cloudinaryFolder || process.env.CLOUDINARY_FOLDER,
    supabaseUrl: config.supabaseUrl || process.env.SUPABASE_URL,
    supabaseSecretKey: config.supabaseSecretKey || process.env.SUPABASE_SECRET_KEY,
    supabaseServiceRoleKey: config.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseBucket: config.supabaseBucket || process.env.SUPABASE_STORAGE_BUCKET,
    supabasePathPrefix: config.supabasePathPrefix || process.env.SUPABASE_STORAGE_PATH_PREFIX,
  };
  const lookService = new LookService(baseLookServiceConfig);

  function getRequestLookService(request: express.Request) {
    const requestedProvider = extractHeaderValue(request, "x-lookbook-provider")?.toLowerCase();
    const requestOpenAIApiKey = extractHeaderValue(request, "x-openai-api-key");

    if (requestedProvider === "piapi") {
      return {
        provider: "piapi",
        service: new LookService({
          ...baseLookServiceConfig,
          provider: "piapi",
        }),
      };
    }

    if (requestedProvider === "openai") {
      return {
        provider: "openai",
        service: new LookService({
          ...baseLookServiceConfig,
          provider: "openai",
          openAIApiKey: requestOpenAIApiKey || baseLookServiceConfig.openAIApiKey,
        }),
      };
    }

    return {
      provider,
      service: lookService,
    };
  }

  app.use(cors());
  app.use(express.json({ limit: "60mb" }));

  app.get("/", (_request, response) => {
    response.json({
      status: "ok",
      service: "AI LookBook backend",
      health: "/health",
      generateLook: "/generate-look",
    });
  });

  app.get("/health", (_request, response) => {
    const requestProvider = getRequestLookService(_request).provider;
    const requestOpenAIApiKey = extractHeaderValue(_request, "x-openai-api-key");

    response.json({
      status: "ok",
      provider: requestProvider,
      openAIConfigured: Boolean(requestOpenAIApiKey || config.openAIApiKey || process.env.OPENAI_API_KEY),
      piapiConfigured: Boolean(config.piapiApiKey || process.env.PIAPI_API_KEY),
      cloudinaryConfigured: Boolean(
        (config.cloudinaryCloudName || process.env.CLOUDINARY_CLOUD_NAME) &&
          (config.cloudinaryApiKey || process.env.CLOUDINARY_API_KEY) &&
          (config.cloudinaryApiSecret || process.env.CLOUDINARY_API_SECRET),
      ),
      supabaseConfigured: Boolean(
        (config.supabaseUrl || process.env.SUPABASE_URL) &&
          (config.supabaseSecretKey ||
            process.env.SUPABASE_SECRET_KEY ||
            config.supabaseServiceRoleKey ||
            process.env.SUPABASE_SERVICE_ROLE_KEY),
      ),
      date: new Date().toISOString(),
    });
  });

  app.post("/auth/register", async (request, response) => {
    try {
      const payload = userProfileSchema.parse(request.body);
      const user = await userRepository.createOrFindByEmail(payload);
      response.json(user);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha inesperada";
      response.status(400).json({ error: message });
    }
  });

  app.post("/generate-look", async (request, response) => {
    try {
      const payload = lookGenerationRequestSchema.parse(request.body);
      const requestLookService = getRequestLookService(request);
      const looks = await requestLookService.service.generateLooks(payload);
      const sessionId = payload.sessionId || request.header("x-session-id") || "anonymous";
      const userId = payload.userId || request.header("x-user-id") || undefined;
      const historyEntry = await historyRepository.saveGeneration({
        sessionId,
        userId,
        provider: requestLookService.provider,
        request: payload,
        looks,
      });

      response.setHeader("x-look-history-id", historyEntry.id);
      response.setHeader("x-session-id", sessionId);
      if (userId) {
        response.setHeader("x-user-id", userId);
      }
      response.json(looks);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha inesperada";
      response.status(400).json({ error: message });
    }
  });

  app.get("/history", async (request, response) => {
    try {
      const userId = String(request.query.userId || request.header("x-user-id") || "");
      const sessionId = String(request.query.sessionId || request.header("x-session-id") || "");

      if (!sessionId && !userId) {
        response.status(400).json({ error: "Informe userId ou sessionId na query ou nos headers." });
        return;
      }

      const entries = userId
        ? await historyRepository.listByUser(userId)
        : await historyRepository.listBySession(sessionId);
      response.json(entries);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha inesperada";
      response.status(400).json({ error: message });
    }
  });

  app.get("/favorites", async (request, response) => {
    try {
      const userId = String(request.query.userId || request.header("x-user-id") || "");
      if (!userId) {
        response.status(400).json({ error: "Informe userId na query ou no header x-user-id." });
        return;
      }

      const favorites = await favoriteRepository.listByUser(userId);
      response.json({ userId, historyIds: favorites });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha inesperada";
      response.status(400).json({ error: message });
    }
  });

  app.post("/favorites/toggle", async (request, response) => {
    try {
      const payload = favoriteToggleSchema.parse(request.body);
      const historyIds = await favoriteRepository.toggle(payload.userId, payload.historyId);
      response.json({ userId: payload.userId, historyIds });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha inesperada";
      response.status(400).json({ error: message });
    }
  });

  app.get("/history/:id", async (request, response) => {
    try {
      const entry = await historyRepository.getById(request.params.id);
      if (!entry) {
        response.status(404).json({ error: "Histórico não encontrado." });
        return;
      }

      response.json(entry);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha inesperada";
      response.status(400).json({ error: message });
    }
  });

  return { app, provider };
}

const isEntryFile = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntryFile) {
  const port = Number.parseInt(process.env.PORT || "8787", 10);
  const { app, provider } = createApp();

  app.listen(port, () => {
    console.log(`AI Lookbook backend on http://localhost:${port} using provider=${provider}`);
  });
}
