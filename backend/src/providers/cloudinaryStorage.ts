import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";
import { RemoteImageAsset } from "../types.js";

type CloudinaryTemporaryStorageConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder?: string;
};

type UploadedCloudinaryImage = {
  publicUrl: string;
  publicId: string;
};

function toDataUri(buffer: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

async function normalizeImageAsset(image: RemoteImageAsset) {
  if (!image.base64) {
    throw new Error("A imagem precisa incluir base64 para upload temporário.");
  }

  const input = Buffer.from(image.base64, "base64");
  const output = await sharp(input)
    .rotate()
    .resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();

  return {
    mimeType: "image/jpeg",
    buffer: output,
  };
}

export class CloudinaryTemporaryStorage {
  private readonly folder: string;

  constructor(private readonly config: CloudinaryTemporaryStorageConfig) {
    this.folder = (config.folder || "temporary").replace(/^\/+|\/+$/g, "");

    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      secure: true,
    });
  }

  async uploadBase64Image(image: RemoteImageAsset, prefix: string): Promise<UploadedCloudinaryImage> {
    const normalized = await normalizeImageAsset(image);
    const folderPath = [this.folder, prefix].filter(Boolean).join("/");

    const uploaded = await cloudinary.uploader.upload(toDataUri(normalized.buffer, normalized.mimeType), {
      folder: folderPath,
      resource_type: "image",
      format: "jpg",
      use_filename: false,
      unique_filename: true,
      overwrite: false,
    });

    return {
      publicUrl: uploaded.secure_url,
      publicId: uploaded.public_id,
    };
  }

  async removeFiles(publicIds: string[]) {
    const ids = publicIds.filter(Boolean);
    if (!ids.length) {
      return;
    }

    await Promise.all(
      ids.map(async (publicId) => {
        try {
          await cloudinary.uploader.destroy(publicId, {
            invalidate: true,
            resource_type: "image",
          });
        } catch (error) {
          console.warn(`Falha ao remover asset temporário do Cloudinary: ${publicId}`, error);
        }
      }),
    );
  }
}
