import { renderLookPreview } from "./openaiImageRenderer.js";
import { createOpenAIResponse } from "./openaiClient.js";
import { LookGenerationRequest, LookResult, LookSuggestion } from "../types.js";

type OpenAIProviderConfig = {
  apiKey?: string;
  textModel?: string;
  imageModel?: string;
  renderImages?: boolean;
};

type OpenAIContentPart = {
  type?: string;
  text?: string;
  json?: unknown;
};

type OpenAIResponsePayload = {
  output_text?: string;
  status?: string;
  output?: Array<{
    type?: string;
    status?: string;
    content?: OpenAIContentPart[];
  }>;
};

function buildPrompt(input: LookGenerationRequest) {
  const garments = input.garments.map((piece) => `${piece.id}: ${piece.label} (${piece.category})`).join(", ");
  return [
    "You are a fashion stylist and virtual try-on planner.",
    `Create up to ${input.maxLooks} distinct outfit combinations for the supplied model using only these items: ${garments}.`,
    `Target style: ${input.styleBrief || "balanced, realistic, wearable fashion"}.`,
    "Return concise rationale for each look, a short fashion trend comment related to the selected pieces, and a production-ready try-on prompt for image generation.",
  ].join(" ");
}

function stringifyJsonContent(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return undefined;
}

export function extractOpenAIOutputText(data: OpenAIResponsePayload) {
  if (data.output_text?.trim()) {
    return data.output_text;
  }

  const contentParts = data.output?.flatMap((item) => item.content || []) || [];
  const explicitOutputText = contentParts.find((part) => part.type === "output_text" && part.text?.trim())?.text;

  if (explicitOutputText) {
    return explicitOutputText;
  }

  const firstJson = contentParts.map((part) => stringifyJsonContent(part.json)).find(Boolean);
  if (firstJson) {
    return firstJson;
  }

  return contentParts.find((part) => part.text?.trim())?.text;
}

function parseOpenAILookSuggestions(data: OpenAIResponsePayload) {
  const outputText = extractOpenAIOutputText(data);

  if (!outputText) {
    const outputSummary = data.output
      ?.map((item) => `${item.type || "sem_tipo"}:${item.status || "sem_status"}`)
      .join(", ");
    throw new Error(
      `A OpenAI respondeu sem texto utilizável. Status: ${data.status || "desconhecido"}. Saída: ${outputSummary || "vazia"}.`,
    );
  }

  try {
    return JSON.parse(outputText) as {
      looks: LookSuggestion[];
    };
  } catch {
    throw new Error("A OpenAI respondeu, mas o texto não veio em JSON válido.");
  }
}

export async function generateOpenAILooks(input: LookGenerationRequest, config: OpenAIProviderConfig): Promise<LookResult[]> {
  if (!config.apiKey) {
    throw new Error("OPENAI_API_KEY não configurada no backend.");
  }

  const data = (await createOpenAIResponse(config.apiKey, {
    model: config.textModel || "gpt-5.4-mini",
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
                  trendComment: { type: "string" },
                  pieceIds: {
                    type: "array",
                    items: { type: "string" },
                  },
                  prompt: { type: "string" },
                },
                required: ["title", "summary", "trendComment", "pieceIds", "prompt"],
              },
            },
          },
          required: ["looks"],
        },
      },
    },
  })) as OpenAIResponsePayload;

  const parsed = parseOpenAILookSuggestions(data);

  const baseLooks: LookResult[] = parsed.looks.map((look, index) => ({
    id: `look-${index + 1}`,
    title: look.title,
    summary: look.summary,
    trendComment: look.trendComment,
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
