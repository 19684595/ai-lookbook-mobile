import { generateMockLooks } from "../providers/mockProvider.js";
import { generateOpenAILooks } from "../providers/openaiProvider.js";
import { generatePiApiLooks } from "../providers/piapiProvider.js";
import { LookGenerationRequest, LookResult } from "../types.js";

type ServiceConfig = {
  provider: string;
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

export class LookService {
  constructor(private readonly config: ServiceConfig) {}

  async generateLooks(input: LookGenerationRequest): Promise<LookResult[]> {
    if (!input.modelImage?.base64) {
      throw new Error("A imagem da modelo precisa incluir base64.");
    }

    if (!input.garments?.length) {
      throw new Error("Envie pelo menos uma peca.");
    }

    if (this.config.provider === "openai") {
      return generateOpenAILooks(input, {
        apiKey: this.config.openAIApiKey,
        textModel: this.config.openAITextModel,
        imageModel: this.config.openAIImageModel,
        renderImages: this.config.openAIRenderImages,
      });
    }

    if (this.config.provider === "piapi") {
      return generatePiApiLooks(input, {
        apiKey: this.config.piapiApiKey,
        pollIntervalMs: this.config.piapiPollIntervalMs,
        maxPollAttempts: this.config.piapiMaxPollAttempts,
        temporaryHost: this.config.piapiTemporaryHost,
        cloudinaryCloudName: this.config.cloudinaryCloudName,
        cloudinaryApiKey: this.config.cloudinaryApiKey,
        cloudinaryApiSecret: this.config.cloudinaryApiSecret,
        cloudinaryFolder: this.config.cloudinaryFolder,
        supabaseUrl: this.config.supabaseUrl,
        supabaseSecretKey: this.config.supabaseSecretKey,
        supabaseServiceRoleKey: this.config.supabaseServiceRoleKey,
        supabaseBucket: this.config.supabaseBucket,
        supabasePathPrefix: this.config.supabasePathPrefix,
      });
    }

    return generateMockLooks(input);
  }
}
