import fs from "node:fs/promises";
import path from "node:path";
import { UserProfile } from "../types.js";

type UserStore = {
  users: UserProfile[];
};

function makeId() {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class UserRepository {
  constructor(private readonly filePath: string) {}

  async createOrFindByEmail(params: { displayName: string; email: string }) {
    const store = await this.readStore();
    const normalizedEmail = params.email.trim().toLowerCase();
    const existing = store.users.find((user) => user.email.toLowerCase() === normalizedEmail);

    if (existing) {
      if (existing.displayName !== params.displayName) {
        existing.displayName = params.displayName;
        await this.writeStore(store);
      }

      return existing;
    }

    const user: UserProfile = {
      userId: makeId(),
      displayName: params.displayName.trim(),
      email: normalizedEmail,
      createdAt: new Date().toISOString(),
    };

    store.users.unshift(user);
    await this.writeStore(store);
    return user;
  }

  private async readStore(): Promise<UserStore> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      return JSON.parse(raw) as UserStore;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return { users: [] };
      }

      throw error;
    }
  }

  private async writeStore(store: UserStore) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(store, null, 2), "utf8");
  }
}
