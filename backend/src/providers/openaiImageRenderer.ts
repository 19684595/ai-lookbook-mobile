import { createOpenAIResponse } from "./openaiClient.js";
import { LookGenerationRequest, RemoteGarmentPiece } from "../types.js";

type RenderConfig = {
  apiKey: string;
  model: string;
};

function asDataUrl(base64: string, mimeType?: string) {
  return `data:${mimeType || "image/jpeg"};base64,${base64}`;
}

function buildRenderInstruction(styleBrief: string, pieces: RemoteGarmentPiece[], prompt: string) {
  const garmentList = pieces.map((piece) => `${piece.label} (${piece.category})`).join(", ");
  return [
    "Use the first image as the identity reference for the person.",
    "Use the remaining images as garment references only.",
    `Dress the same person in these exact items: ${garmentList}.`,
    `Style brief: ${styleBrief || "realistic, wearable fashion styling"}.`,
    prompt,
    "Preserve facial identity, body proportions, and realistic textile detail.",
    "Create a clean smartphone-photo style full-body fashion image.",
  ].join(" ");
}

export async function renderLookPreview(
  input: LookGenerationRequest,
  pieces: RemoteGarmentPiece[],
  prompt: string,
  config: RenderConfig,
) {
  const content = [
    {
      type: "input_text",
      text: buildRenderInstruction(input.styleBrief, pieces, prompt),
    },
    {
      type: "input_image",
      image_url: asDataUrl(input.modelImage.base64!, input.modelImage.mimeType),
    },
    ...pieces
      .filter((piece) => piece.image.base64)
      .map((piece) => ({
        type: "input_image" as const,
        image_url: asDataUrl(piece.image.base64!, piece.image.mimeType),
      })),
  ];

  const data = (await createOpenAIResponse(config.apiKey, {
    model: config.model,
    input: [
      {
        role: "user",
        content,
      },
    ],
    tools: [
      {
        type: "image_generation",
        size: "1024x1536",
        quality: "medium",
        format: "png",
        background: "opaque",
        action: "auto",
      },
    ],
    tool_choice: { type: "image_generation" },
  })) as {
    output?: Array<{ type?: string; result?: string }>;
  };

  const imageCall = data.output?.find((item) => item.type === "image_generation_call" && item.result);
  if (!imageCall?.result) {
    return undefined;
  }

  return `data:image/png;base64,${imageCall.result}`;
}
