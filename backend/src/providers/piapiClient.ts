type PiApiCreateTaskPayload = {
  model: string;
  task_type: string;
  input: Record<string, unknown>;
  config?: Record<string, unknown>;
};

type PiApiTaskResponse = {
  code?: number;
  message?: string;
  data?: {
    task_id: string;
    status: string;
    output?: {
      image_url?: string;
      image_urls?: string[];
      works?: Array<{
        image?: {
          resource?: string;
          resource_without_watermark?: string;
        };
        cover?: {
          resource?: string;
          resource_without_watermark?: string;
        };
      }>;
    };
    error?: {
      code?: number;
      message?: string;
      raw_message?: string;
    };
  };
};

async function piapiFetch<T>(apiKey: string, url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PiAPI respondeu com status ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export async function createPiApiTask(apiKey: string, payload: PiApiCreateTaskPayload) {
  return piapiFetch<PiApiTaskResponse>(apiKey, "https://api.piapi.ai/api/v1/task", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPiApiTask(apiKey: string, taskId: string) {
  return piapiFetch<PiApiTaskResponse>(apiKey, `https://api.piapi.ai/api/v1/task/${taskId}`, {
    method: "GET",
  });
}

export async function getPiApiAccountInfo(apiKey: string) {
  return piapiFetch<Record<string, unknown>>(apiKey, "https://api.piapi.ai/account/info", {
    method: "GET",
  });
}
