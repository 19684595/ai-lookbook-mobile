import { GarmentCategory, GarmentPiece, LookGenerationInput, LookResult } from "../types";

function byCategory(garments: GarmentPiece[], category: GarmentCategory) {
  return garments.filter((piece) => piece.category === category);
}

function takeOrFallback(garments: GarmentPiece[], primary: GarmentCategory, fallback: GarmentCategory[]) {
  const direct = byCategory(garments, primary);
  if (direct.length > 0) {
    return direct;
  }

  return fallback.flatMap((item) => byCategory(garments, item));
}

function buildPrompt(input: LookGenerationInput, pieces: GarmentPiece[]) {
  const pieceLabels = pieces.map((piece) => `${piece.label} (${piece.category})`).join(", ");
  return [
    "Use the provided person image as the fixed model identity.",
    `Dress the model with the following items: ${pieceLabels}.`,
    `Style direction: ${input.styleBrief || "fashion editorial, wearable and realistic"}.`,
    "Preserve body proportions and facial identity, keep garment textures realistic, and produce a natural smartphone-photo look.",
  ].join(" ");
}

function describeTrend(pieces: GarmentPiece[]) {
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

export async function generateMockLooks(input: LookGenerationInput): Promise<LookResult[]> {
  const tops = takeOrFallback(input.garments, "top", ["dress"]);
  const bottoms = takeOrFallback(input.garments, "bottom", ["dress"]);
  const shoes = takeOrFallback(input.garments, "shoes", []);
  const accessories = takeOrFallback(input.garments, "accessory", []);

  const combinations: GarmentPiece[][] = [];

  for (const top of tops.length > 0 ? tops : [undefined]) {
    for (const bottom of bottoms.length > 0 ? bottoms : [undefined]) {
      const basePieces = [top, bottom].filter(Boolean) as GarmentPiece[];

      if (basePieces.length === 0) {
        continue;
      }

      const shoe = shoes[combinations.length % Math.max(shoes.length, 1)];
      const accessory = accessories[combinations.length % Math.max(accessories.length, 1)];
      const fullLook = [basePieces[0], basePieces[1], shoe, accessory].filter(Boolean) as GarmentPiece[];
      combinations.push(fullLook);

      if (combinations.length >= input.maxLooks) {
        break;
      }
    }

    if (combinations.length >= input.maxLooks) {
      break;
    }
  }

  if (combinations.length === 0) {
    combinations.push(input.garments.slice(0, Math.min(input.garments.length, 3)));
  }

  return combinations.slice(0, input.maxLooks).map((pieces, index) => ({
    id: `look-${index + 1}`,
    title: `Look ${index + 1}`,
    summary: describeLook(input.styleBrief, pieces),
    trendComment: describeTrend(pieces),
    pieces,
    prompt: buildPrompt(input, pieces),
    previewUri: input.modelImage.uri,
  }));
}

function describeLook(styleBrief: string, pieces: GarmentPiece[]) {
  const categories = pieces.map((piece) => piece.category).join(", ");
  return `Combinação pensada para ${styleBrief || "uso versátil"}, equilibrando as categorias ${categories}.`;
}
