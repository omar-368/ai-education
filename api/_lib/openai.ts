const endpoint = "https://api.openai.com/v1/chat/completions";

interface OpenAIOptions {
  maxTokens?: number;
}

const retryableStatuses = new Set([408, 409, 429, 500, 502, 503, 504]);

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function askOpenAI(
  system: string,
  user: unknown,
  options: OpenAIOptions = {},
) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";

  const body = JSON.stringify({
    model,
    max_completion_tokens: options.maxTokens ?? 2_000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(user) },
    ],
  });

  let response: Response | undefined;
  let networkError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 75_000);
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body,
        signal: controller.signal,
      });
      if (response.ok || !retryableStatuses.has(response.status) || attempt === 1) {
        break;
      }
    } catch (error) {
      networkError = error;
      if (attempt === 1) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("The AI provider timed out. Please try again.");
        }
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }

    await wait(350);
  }

  if (!response) {
    if (networkError instanceof Error && networkError.name === "AbortError") {
      throw new Error("The AI provider timed out. Please try again.");
    }
    throw networkError instanceof Error
      ? networkError
      : new Error("The AI provider could not be reached. Please try again.");
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI request failed (${response.status}).`;
    throw new Error(message);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("The AI returned an empty response.");

  try {
    const cleaned = content.replace(/^```(?:json)?\s*|\s*```$/gi, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    const json = firstBrace >= 0 && lastBrace > firstBrace
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;
    return JSON.parse(json);
  } catch {
    throw new Error("The AI response was not valid JSON. Please generate again.");
  }
}

export function sendError(response: { status: (code: number) => { json: (body: unknown) => void } }, error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  const status = message.includes("not configured") ? 500 : 502;
  response.status(status).json({
    error: message.includes("Insufficient credits")
      ? "The configured AI model is unavailable for this account. Check the OpenAI model or billing."
      : message,
  });
}
