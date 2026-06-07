import sharp from "sharp";
import { RemoteImageAsset } from "../types.js";

type UploadedCatboxAsset = {
  publicUrl: string;
};

function randomName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
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

  return output;
}

export class CatboxTemporaryStorage {
  async uploadBase64Image(image: RemoteImageAsset, prefix: string): Promise<UploadedCatboxAsset> {
    const normalizedBuffer = await normalizeImageAsset(image);
    const fileName = randomName(prefix);
    const formData = new FormData();
    const bytes = new Uint8Array(normalizedBuffer);
    const blob = new Blob([bytes], { type: "image/jpeg" });

    formData.set("reqtype", "fileupload");
    formData.set("fileToUpload", blob, fileName);

    const response = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: formData,
    });

    const text = (await response.text()).trim();
    if (!response.ok) {
      throw new Error(`Falha no upload temporário para o Catbox: ${response.status} ${text}`);
    }

    if (!/^https?:\/\//i.test(text)) {
      throw new Error(`Catbox não retornou uma URL válida: ${text}`);
    }

    return {
      publicUrl: text,
    };
  }

  async removeFiles(_ids: string[]) {
    return;
  }
}
