import fs from "node:fs/promises";
import path from "node:path";
import { LookGenerationRequest, LookHistoryEntry, LookResult } from "../types.js";

type HistoryStore = {
  entries: LookHistoryEntry[];
};

function makeId() {
  return `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class HistoryRepository {
  constructor(private readonly filePath: string) {}

  async saveGeneration(params: {
    sessionId: string;
    userId?: string;
    provider: string;
    request: LookGenerationRequest;
    looks: LookResult[];
  }) {
    const store = await this.readStore();
    const entry: LookHistoryEntry = {
      id: makeId(),
      sessionId: params.sessionId,
      userId: params.userId,
      provider: params.provider,
      createdAt: new Date().toISOString(),
      request: {
        styleBrief: params.request.styleBrief,
        maxLooks: params.request.maxLooks,
        garmentCount: params.request.garments.length,
      },
      looks: params.looks,
    };

    store.entries.unshift(entry);
    store.entries = store.entries.slice(0, 200);
    await this.writeStore(store);
    return entry;
  }

  async listBySession(sessionId: string) {
    const store = await this.readStore();
    return store.entries.filter((entry) => entry.sessionId === sessionId);
  }

  async listByUser(userId: string) {
    const store = await this.readStore();
    return store.entries.filter((entry) => entry.userId === userId);
  }

  async getById(id: string) {
    const store = await this.readStore();
    return store.entries.find((entry) => entry.id === id) || null;
  }

  private async readStore(): Promise<HistoryStore> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      return JSON.parse(raw) as HistoryStore;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return { entries: [] };
      }

      throw error;
    }
  }

  private async writeStore(store: HistoryStore) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(store, null, 2), "utf8");
  }
}
