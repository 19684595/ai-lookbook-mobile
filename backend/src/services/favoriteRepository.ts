import fs from "node:fs/promises";
import path from "node:path";

type FavoriteStore = {
  favoritesByUser: Record<string, string[]>;
};

export class FavoriteRepository {
  constructor(private readonly filePath: string) {}

  async listByUser(userId: string) {
    const store = await this.readStore();
    return store.favoritesByUser[userId] || [];
  }

  async toggle(userId: string, historyId: string) {
    const store = await this.readStore();
    const current = new Set(store.favoritesByUser[userId] || []);

    if (current.has(historyId)) {
      current.delete(historyId);
    } else {
      current.add(historyId);
    }

    store.favoritesByUser[userId] = Array.from(current);
    await this.writeStore(store);
    return store.favoritesByUser[userId];
  }

  private async readStore(): Promise<FavoriteStore> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      return JSON.parse(raw) as FavoriteStore;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return { favoritesByUser: {} };
      }

      throw error;
    }
  }

  private async writeStore(store: FavoriteStore) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(store, null, 2), "utf8");
  }
}
