import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import WebSocket from "ws";
import { RemoteImageAsset } from "../types.js";

type SupabaseStorageConfig = {
  url?: string;
  serviceRoleKey?: string;
  bucket?: string;
  pathPrefix?: string;
};

type UploadedAsset = {
  path: string;
  publicUrl: string;
};

function randomName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
}

function asBuffer(base64: string) {
  return Buffer.from(base64, "base64");
}

async function normalizeImageBuffer(base64: string) {
  return sharp(asBuffer(base64))
    .rotate()
    .resize({
      width: 1536,
      height: 1536,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({
      quality: 88,
      mozjpeg: true,
    })
    .toBuffer();
}

export class SupabaseTemporaryStorage {
  private readonly client;
  private readonly bucket: string;
  private readonly pathPrefix: string;

  constructor(config: SupabaseStorageConfig) {
    if (!config.url || !config.serviceRoleKey) {
      throw new Error("SUPABASE_URL e a chave secreta do Supabase precisam estar configuradas.");
    }

    this.client = createClient(config.url, config.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        transport: WebSocket as never,
      },
    });
    this.bucket = config.bucket || "tryon-temp";
    this.pathPrefix = config.pathPrefix || "temporary";
  }

  async uploadBase64Image(image: RemoteImageAsset, prefix: string): Promise<UploadedAsset> {
    if (!image.base64) {
      throw new Error("A imagem precisa ter base64 para upload no Supabase.");
    }

    const objectPath = `${this.pathPrefix}/${randomName(prefix)}`;
    const normalizedBuffer = await normalizeImageBuffer(image.base64);

    const { error: uploadError } = await this.client.storage.from(this.bucket).upload(objectPath, normalizedBuffer, {
      contentType: "image/jpeg",
      upsert: false,
      cacheControl: "300",
    });

    if (uploadError) {
      throw new Error(`Falha no upload temporário para o Supabase: ${uploadError.message}`);
    }

    const { data } = this.client.storage.from(this.bucket).getPublicUrl(objectPath);
    if (!data.publicUrl) {
      throw new Error("O Supabase não retornou publicUrl para o arquivo temporário.");
    }

    return {
      path: objectPath,
      publicUrl: data.publicUrl,
    };
  }

  async listBuckets() {
    return this.client.storage.listBuckets();
  }

  async removeFiles(paths: string[]) {
    if (paths.length === 0) {
      return;
    }

    const { error } = await this.client.storage.from(this.bucket).remove(paths);
    if (error) {
      console.warn(`Supabase cleanup warning: ${error.message}`);
    }
  }
}
