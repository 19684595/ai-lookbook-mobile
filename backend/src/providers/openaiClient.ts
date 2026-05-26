const OPENAI_BASE_URL = "https://api.openai.com/v1";

export async function createOpenAIResponse(apiKey: string, body: unknown) {
  const response = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha ao consultar OpenAI: ${errorText}`);
  }

  return response.json();
}
