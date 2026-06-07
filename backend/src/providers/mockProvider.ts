import { LookGenerationRequest, LookResult, RemoteGarmentPiece } from "../types.js";

function filterCategory(garments: RemoteGarmentPiece[], category: RemoteGarmentPiece["category"]) {
  return garments.filter((piece) => piece.category === category);
}

function dataUriFromBase64(base64?: string, mimeType?: string) {
  if (!base64) {
    return undefined;
  }

  return `data:${mimeType || "image/jpeg"};base64,${base64}`;
}

function buildPrompt(input: LookGenerationRequest, pieces: RemoteGarmentPiece[]) {
  const labels = pieces.map((piece) => `${piece.label} (${piece.category})`).join(", ");
  return [
    "Use the person image as identity reference and keep the face unchanged.",
    `Dress the model using these clothing items: ${labels}.`,
    `Style target: ${input.styleBrief || "fashionable, realistic outfit"}.`,
    "Keep fabric details coherent and produce a believable mobile photo result.",
  ].join(" ");
}

function describeTrend(pieces: RemoteGarmentPiece[]) {
  const labels = pieces.map((piece) => piece.label).join(", ");
  const categories = pieces.map((piece) => piece.category);

  if (categories.includes("dress")) {
    return `Tendência: peças únicas seguem fortes pela praticidade. ${labels} funciona bem com styling leve, acessórios pontuais e contraste de textura.`;
  }

  if (categories.includes("top") && categories.includes("bottom")) {
    return `Tendência: coordenações entre parte de cima e parte de baixo valorizam proporção e versatilidade. ${labels} conversa com a busca por looks funcionais e bem acabados.`;
  }

  return `Tendência: o look conversa com a valorização de peças-chave e styling pessoal. ${labels} pode ganhar força com sobreposição, textura ou um ponto de cor.`;
}

export async function generateMockLooks(input: LookGenerationRequest): Promise<LookResult[]> {
  const tops = filterCategory(input.garments, "top");
  const bottoms = filterCategory(input.garments, "bottom");
  const dresses = filterCategory(input.garments, "dress");
  const shoes = filterCategory(input.garments, "shoes");
  const accessories = filterCategory(input.garments, "accessory");
  const looks: RemoteGarmentPiece[][] = [];

  if (dresses.length > 0) {
    for (const dress of dresses) {
      looks.push([dress, shoes[looks.length % Math.max(shoes.length, 1)], accessories[looks.length % Math.max(accessories.length, 1)]].filter(Boolean) as RemoteGarmentPiece[]);
      if (looks.length >= input.maxLooks) {
        break;
      }
    }
  }

  for (const top of tops.length > 0 ? tops : [undefined]) {
    for (const bottom of bottoms.length > 0 ? bottoms : [undefined]) {
      const base = [top, bottom].filter(Boolean) as RemoteGarmentPiece[];
      if (base.length === 0) {
        continue;
      }

      looks.push([base[0], base[1], shoes[looks.length % Math.max(shoes.length, 1)], accessories[looks.length % Math.max(accessories.length, 1)]].filter(Boolean) as RemoteGarmentPiece[]);
      if (looks.length >= input.maxLooks) {
        break;
      }
    }

    if (looks.length >= input.maxLooks) {
      break;
    }
  }

  if (looks.length === 0) {
    looks.push(input.garments.slice(0, Math.min(input.garments.length, 3)));
  }

  const previewUri = dataUriFromBase64(input.modelImage.base64, input.modelImage.mimeType);

  return looks.slice(0, input.maxLooks).map((pieces, index) => ({
    id: `look-${index + 1}`,
    title: `Look ${index + 1}`,
    summary: `Sugestão para ${input.styleBrief || "uso geral"} com ${pieces.map((piece) => piece.label).join(", ")}.`,
    trendComment: describeTrend(pieces),
    pieces,
    prompt: buildPrompt(input, pieces),
    previewUri,
  }));
}
