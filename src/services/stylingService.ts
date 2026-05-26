import { generateMockLooks } from "./mockStylingEngine";
import { LookGenerationInput, LookResult } from "../types";
import { toRemotePayload } from "./remotePayload";

export interface StylingProvider {
  generateLooks(input: LookGenerationInput): Promise<LookResult[]>;
}

export async function checkStylingBackend(baseUrl: string) {
  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/health`);
  if (!response.ok) {
    throw new Error(`Backend indisponivel com status ${response.status}.`);
  }

  return (await response.json()) as {
    status: string;
    provider?: string;
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
  constructor(private readonly baseUrl: string) {}

  async generateLooks(input: LookGenerationInput): Promise<LookResult[]> {
    const response = await fetch(`${this.baseUrl.replace(/\/+$/, "")}/generate-look`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
};

export function createStylingService(options: StylingServiceOptions = {}): StylingProvider {
  const baseUrl = (options.baseUrl ?? process.env.EXPO_PUBLIC_STYLING_API_URL ?? "").trim();

  if (baseUrl) {
    return new RemoteStylingProvider(baseUrl);
  }

  return new MockStylingProvider();
}
