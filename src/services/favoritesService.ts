import * as FileSystem from "expo-file-system";

const FAVORITES_FILE = `${FileSystem.documentDirectory ?? ""}favorite-history-entries.json`;

type FavoritesStore = {
  ids: string[];
};

async function readStore(): Promise<FavoritesStore> {
  if (!FileSystem.documentDirectory) {
    return { ids: [] };
  }

  try {
    const info = await FileSystem.getInfoAsync(FAVORITES_FILE);
    if (!info.exists) {
      return { ids: [] };
    }

    const raw = await FileSystem.readAsStringAsync(FAVORITES_FILE);
    return JSON.parse(raw) as FavoritesStore;
  } catch {
    return { ids: [] };
  }
}

async function writeStore(store: FavoritesStore) {
  if (!FileSystem.documentDirectory) {
    return;
  }

  await FileSystem.writeAsStringAsync(FAVORITES_FILE, JSON.stringify(store));
}

async function listLocalFavoriteHistoryIds() {
  const store = await readStore();
  return store.ids;
}

async function toggleLocalFavoriteHistoryId(entryId: string) {
  const store = await readStore();
  const ids = new Set(store.ids);

  if (ids.has(entryId)) {
    ids.delete(entryId);
  } else {
    ids.add(entryId);
  }

  const next = Array.from(ids);
  await writeStore({ ids: next });
  return next;
}

export interface FavoriteProvider {
  list(userId?: string): Promise<string[]>;
  toggle(entryId: string, userId?: string): Promise<string[]>;
}

class HybridFavoriteProvider implements FavoriteProvider {
  constructor(private readonly baseUrl?: string) {}

  async list(userId?: string) {
    if (this.baseUrl && userId) {
      const response = await fetch(`${this.baseUrl}/favorites?userId=${encodeURIComponent(userId)}`);
      if (!response.ok) {
        throw new Error("Não foi possível carregar os favoritos sincronizados.");
      }

      const data = (await response.json()) as { historyIds: string[] };
      return data.historyIds;
    }

    return listLocalFavoriteHistoryIds();
  }

  async toggle(entryId: string, userId?: string) {
    if (this.baseUrl && userId) {
      const response = await fetch(`${this.baseUrl}/favorites/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, historyId: entryId }),
      });

      if (!response.ok) {
        throw new Error("Não foi possível atualizar os favoritos sincronizados.");
      }

      const data = (await response.json()) as { historyIds: string[] };
      return data.historyIds;
    }

    return toggleLocalFavoriteHistoryId(entryId);
  }
}

export function createFavoriteService() {
  return new HybridFavoriteProvider(process.env.EXPO_PUBLIC_STYLING_API_URL);
}
