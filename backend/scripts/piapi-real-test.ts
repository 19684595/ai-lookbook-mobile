import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { createApp } from "../src/server.js";
import { CloudinaryTemporaryStorage } from "../src/providers/cloudinaryStorage.js";

const modelFile = "G:/a51brenda/HDCamera/IMG_20210621_215707.jpg";
const dressFile = "C:/Users/Zancan/Downloads/WhatsApp Image 2024-08-21 at 09.15.19.jpeg";

async function testCloudinaryUpload() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.log("Cloudinary nao configurado; pulando teste de upload.");
    return;
  }

  const storage = new CloudinaryTemporaryStorage({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER,
  });

  const data = await fs.readFile(modelFile);
  const uploaded = await storage.uploadBase64Image(
    {
      fileName: path.basename(modelFile),
      mimeType: "image/jpeg",
      base64: data.toString("base64"),
    },
    "model",
  );

  console.log(`Cloudinary upload ok: ${uploaded.publicUrl}`);
  await storage.removeFiles([uploaded.publicId]);
  console.log("Cloudinary cleanup ok");
}

async function testPiApiFlow() {
  const [modelBuffer, dressBuffer] = await Promise.all([fs.readFile(modelFile), fs.readFile(dressFile)]);

  const payload = {
    sessionId: "piapi-real-test",
    styleBrief: "Monte um look casual feminino com a peca enviada.",
    maxLooks: 1,
    modelImage: {
      fileName: path.basename(modelFile),
      mimeType: "image/jpeg",
      base64: modelBuffer.toString("base64"),
    },
    garments: [
      {
        id: "dress-1",
        label: "Jardineira jeans clara",
        category: "dress",
        image: {
          fileName: path.basename(dressFile),
          mimeType: "image/jpeg",
          base64: dressBuffer.toString("base64"),
        },
      },
    ],
  };

  const { app } = createApp();
  const server = app.listen(0);

  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Nao foi possivel descobrir a porta do servidor de teste.");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/generate-look`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    console.log(`PiAPI status: ${response.status}`);

    if (!response.ok) {
      console.log(text);
      return;
    }

    const looks = JSON.parse(text) as Array<{
      id: string;
      title: string;
      summary: string;
      previewUri?: string;
      pieces: Array<{ id: string; label: string; category: string }>;
    }>;

    console.log(`Looks gerados: ${looks.length}`);
    console.log(`Primeiro look: ${looks[0]?.title}`);
    console.log(`Preview: ${looks[0]?.previewUri || "sem preview"}`);
    console.log(`Resumo: ${looks[0]?.summary || "sem resumo"}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

async function main() {
  await testCloudinaryUpload();
  await testPiApiFlow();
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exit(1);
});
