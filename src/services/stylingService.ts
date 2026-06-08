import { generateMockLooks } from "./mockStylingEngine";
import { AiProvider, LookGenerationInput, LookResult } from "../types";
import { toRemotePayload } from "./remotePayload";

export interface StylingProvider {
  generateLooks(input: LookGenerationInput): Promise<LookResult[]>;
}

type RemoteAuthOptions = {
  aiProvider?: AiProvider;
  openAIApiKey?: string;
};

function buildRemoteHeaders(options: RemoteAuthOptions = {}) {
  const headers: Record<string, string> = {};
  const aiProvider = options.aiProvider || "piapi";
  const openAIApiKey = options.openAIApiKey?.trim();

  headers["x-lookbook-provider"] = aiProvider;

  if (aiProvider === "openai" && openAIApiKey) {
    headers["x-openai-api-key"] = openAIApiKey;
  }

  return headers;
}

export async function checkStylingBackend(baseUrl: string, options: RemoteAuthOptions = {}) {
  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/health`, {
    headers: buildRemoteHeaders(options),
  });
  if (!response.ok) {
    throw new Error(`Backend indisponível com status ${response.status}.`);
  }

  return (await response.json()) as {
    status: string;
    provider?: string;
    openAIConfigured?: boolean;
    piapiConfigured?: boolean;
    cloudinaryConfigured?: boolean;
    supabaseConfigured?: boolean;
  };
}

class MockStylingProvider implements StylingProvider {
  async generateLooks(input: LookGenerationInput) {
    return generateMockLooks(input);
  }
}

class RemoteStylingProvider implements StylingProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly options: RemoteAuthOptions = {},
  ) {}

  async generateLooks(input: LookGenerationInput): Promise<LookResult[]> {
    const response = await fetch(`${this.baseUrl.replace(/\/+$/, "")}/generate-look`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildRemoteHeaders(this.options),
      },
      body: JSON.stringify(toRemotePayload(input)),
    });

    if (!response.ok) {
      let message = "O provedor de IA retornou erro ao processar os looks.";
      try {
        const payload = (await response.json()) as { error?: string };
        if (payload.error) {
          message = payload.error;
        }
      } catch {
        // Keep default message when backend doesn't return JSON.
      }
      throw new Error(message);
    }

    return (await response.json()) as LookResult[];
  }
}

type StylingServiceOptions = {
  baseUrl?: string;
  aiProvider?: AiProvider;
  openAIApiKey?: string;
};

export function createStylingService(options: StylingServiceOptions = {}): StylingProvider {
  const baseUrl = (options.baseUrl ?? process.env.EXPO_PUBLIC_STYLING_API_URL ?? "").trim();

  if (baseUrl) {
    return new RemoteStylingProvider(baseUrl, {
      aiProvider: options.aiProvider,
      openAIApiKey: options.openAIApiKey,
    });
  }

  return new MockStylingProvider();
}
