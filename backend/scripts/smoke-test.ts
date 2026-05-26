import fs from "node:fs/promises";
import path from "node:path";
import { createApp } from "../src/server.js";

async function main() {
  const samplePath = path.join(process.cwd(), "scripts", "sample-payload.json");
  const raw = await fs.readFile(samplePath, "utf8");
  const payload = JSON.parse(raw);

  const { app } = createApp({
    provider: process.env.LOOKBOOK_PROVIDER || "mock",
  });

  const server = app.listen(0);

  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Nao foi possivel descobrir a porta do servidor de teste.");
    }

    const baseUrl = `http://127.0.0.1:${address.port}`;

    const healthResponse = await fetch(`${baseUrl}/health`);
    if (!healthResponse.ok) {
      throw new Error(`Health check falhou com status ${healthResponse.status}.`);
    }

    const authResponse = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        displayName: "Smoke User",
        email: "smoke@example.com",
      }),
    });

    if (!authResponse.ok) {
      throw new Error(`POST /auth/register falhou com status ${authResponse.status}.`);
    }

    const user = (await authResponse.json()) as { userId: string };
    payload.userId = user.userId;

    const generateResponse = await fetch(`${baseUrl}/generate-look`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!generateResponse.ok) {
      const body = await generateResponse.text();
      throw new Error(`POST /generate-look falhou com status ${generateResponse.status}: ${body}`);
    }

    const looks = (await generateResponse.json()) as Array<{
      id: string;
      title: string;
      prompt: string;
      pieces: Array<{ id: string }>;
      previewUri?: string;
    }>;

    const historyId = generateResponse.headers.get("x-look-history-id");

    if (looks.length === 0) {
      throw new Error("A API respondeu sem looks.");
    }

    if (!historyId) {
      throw new Error("A resposta nao retornou x-look-history-id.");
    }

    const historyResponse = await fetch(`${baseUrl}/history?sessionId=${payload.sessionId}`);
    if (!historyResponse.ok) {
      throw new Error(`GET /history falhou com status ${historyResponse.status}.`);
    }

    const historyEntries = (await historyResponse.json()) as Array<{ id: string; sessionId: string }>;
    if (!historyEntries.some((entry) => entry.id === historyId)) {
      throw new Error("O historico salvo nao apareceu na listagem da sessao.");
    }

    const userHistoryResponse = await fetch(`${baseUrl}/history?userId=${payload.userId}`);
    if (!userHistoryResponse.ok) {
      throw new Error(`GET /history?userId falhou com status ${userHistoryResponse.status}.`);
    }

    const userHistoryEntries = (await userHistoryResponse.json()) as Array<{ id: string; userId?: string }>;
    if (!userHistoryEntries.some((entry) => entry.id === historyId)) {
      throw new Error("O historico do usuario nao apareceu na listagem por userId.");
    }

    const historyDetailResponse = await fetch(`${baseUrl}/history/${historyId}`);
    if (!historyDetailResponse.ok) {
      throw new Error(`GET /history/:id falhou com status ${historyDetailResponse.status}.`);
    }

    const favoritesToggleResponse = await fetch(`${baseUrl}/favorites/toggle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: payload.userId,
        historyId,
      }),
    });

    if (!favoritesToggleResponse.ok) {
      throw new Error(`POST /favorites/toggle falhou com status ${favoritesToggleResponse.status}.`);
    }

    const favoritesResponse = await fetch(`${baseUrl}/favorites?userId=${payload.userId}`);
    if (!favoritesResponse.ok) {
      throw new Error(`GET /favorites falhou com status ${favoritesResponse.status}.`);
    }

    const favorites = (await favoritesResponse.json()) as { historyIds: string[] };
    if (!favorites.historyIds.includes(historyId)) {
      throw new Error("O favorito sincronizado nao apareceu na listagem.");
    }

    console.log(`Smoke test ok: ${looks.length} look(s) gerado(s).`);
    console.log(`Primeiro look: ${looks[0].title} com ${looks[0].pieces.length} peca(s).`);
    console.log(`Preview presente: ${looks[0].previewUri ? "sim" : "nao"}`);
    console.log(`Historico salvo: ${historyId}`);
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

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
