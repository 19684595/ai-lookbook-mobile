import { renderLookPreview } from "./openaiImageRenderer.js";
import { createOpenAIResponse } from "./openaiClient.js";
import { LookGenerationRequest, LookResult, LookSuggestion } from "../types.js";

type OpenAIProviderConfig = {
  apiKey?: string;
  textModel?: string;
  imageModel?: string;
  renderImages?: boolean;
};

function buildPrompt(input: LookGenerationRequest) {
  const garments = input.garments.map((piece) => `${piece.id}: ${piece.label} (${piece.category})`).join(", ");
  return [
    "You are a fashion stylist and virtual try-on planner.",
    `Create up to ${input.maxLooks} distinct outfit combinations for the supplied model using only these items: ${garments}.`,
    `Target style: ${input.styleBrief || "balanced, realistic, wearable fashion"}.`,
    "Return concise rationale for each look and a production-ready try-on prompt for image generation.",
  ].join(" ");
}

export async function generateOpenAILooks(input: LookGenerationRequest, config: OpenAIProviderConfig): Promise<LookResult[]> {
  if (!config.apiKey) {
    throw new Error("OPENAI_API_KEY nao configurada no backend.");
  }

  const data = (await createOpenAIResponse(config.apiKey, {
    model: config.textModel || "gpt-5.5",
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: "You generate structured fashion look suggestions from clothing inventories.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildPrompt(input),
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "look_suggestions",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            looks: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: { type: "string" },
                  summary: { type: "string" },
                  pieceIds: {
                    type: "array",
                    items: { type: "string" },
                  },
                  prompt: { type: "string" },
                },
                required: ["title", "summary", "pieceIds", "prompt"],
              },
            },
          },
          required: ["looks"],
        },
      },
    },
  })) as {
    output_text?: string;
  };

  if (!data.output_text) {
    throw new Error("Resposta da OpenAI veio sem output_text.");
  }

  const parsed = JSON.parse(data.output_text) as {
    looks: LookSuggestion[];
  };

  const baseLooks: LookResult[] = parsed.looks.map((look, index) => ({
    id: `look-${index + 1}`,
    title: look.title,
    summary: look.summary,
    pieces: input.garments.filter((piece) => look.pieceIds.includes(piece.id)),
    prompt: look.prompt,
  }));

  if (!config.renderImages) {
    return baseLooks;
  }

  return Promise.all(
    baseLooks.map(async (look) => ({
      ...look,
      previewUri: await renderLookPreview(input, look.pieces, look.prompt, {
        apiKey: config.apiKey!,
        model: config.imageModel || "gpt-image-2",
      }),
    })),
  );
}
