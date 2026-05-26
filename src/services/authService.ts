import * as FileSystem from "expo-file-system";
import { UserProfile } from "../types";

const PROFILE_FILE = `${FileSystem.documentDirectory ?? ""}user-profile.json`;

export interface AuthProvider {
  register(displayName: string, email: string): Promise<UserProfile>;
  loadLocalProfile(): Promise<UserProfile | null>;
  saveLocalProfile(profile: UserProfile): Promise<void>;
}

class LocalOnlyAuthProvider implements AuthProvider {
  async register(displayName: string, email: string) {
    const profile: UserProfile = {
      userId: `local-user-${Date.now()}`,
      displayName,
      email,
      createdAt: new Date().toISOString(),
    };
    await this.saveLocalProfile(profile);
    return profile;
  }

  async loadLocalProfile() {
    if (!FileSystem.documentDirectory) {
      return null;
    }

    try {
      const info = await FileSystem.getInfoAsync(PROFILE_FILE);
      if (!info.exists) {
        return null;
      }

      const raw = await FileSystem.readAsStringAsync(PROFILE_FILE);
      return JSON.parse(raw) as UserProfile;
    } catch {
      return null;
    }
  }

  async saveLocalProfile(profile: UserProfile) {
    if (!FileSystem.documentDirectory) {
      return;
    }

    await FileSystem.writeAsStringAsync(PROFILE_FILE, JSON.stringify(profile));
  }
}

class RemoteAuthProvider extends LocalOnlyAuthProvider {
  constructor(private readonly baseUrl: string) {
    super();
  }

  async register(displayName: string, email: string) {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ displayName, email }),
    });

    if (!response.ok) {
      throw new Error("Não foi possível registrar o usuário agora.");
    }

    const profile = (await response.json()) as UserProfile;
    await this.saveLocalProfile(profile);
    return profile;
  }
}

export function createAuthService(): AuthProvider {
  const baseUrl = process.env.EXPO_PUBLIC_STYLING_API_URL;

  if (baseUrl) {
    return new RemoteAuthProvider(baseUrl);
  }

  return new LocalOnlyAuthProvider();
}
