import { LookHistoryEntry } from "../types";

export interface HistoryProvider {
  listHistory(params: { sessionId?: string; userId?: string }): Promise<LookHistoryEntry[]>;
}

class EmptyHistoryProvider implements HistoryProvider {
  async listHistory() {
    return [];
  }
}

class RemoteHistoryProvider implements HistoryProvider {
  constructor(private readonly baseUrl: string) {}

  async listHistory(params: { sessionId?: string; userId?: string }): Promise<LookHistoryEntry[]> {
    const query = new URLSearchParams();
    if (params.sessionId) {
      query.set("sessionId", params.sessionId);
    }
    if (params.userId) {
      query.set("userId", params.userId);
    }

    const response = await fetch(`${this.baseUrl}/history?${query.toString()}`);

    if (!response.ok) {
      throw new Error("Não foi possível carregar o histórico desta sessão.");
    }

    return (await response.json()) as LookHistoryEntry[];
  }
}

export function createHistoryService(): HistoryProvider {
  const baseUrl = process.env.EXPO_PUBLIC_STYLING_API_URL;

  if (baseUrl) {
    return new RemoteHistoryProvider(baseUrl);
  }

  return new EmptyHistoryProvider();
}
