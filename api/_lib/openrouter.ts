const endpoint = "https://openrouter.ai/api/v1/chat/completions";

export async function askOpenRouter(system: string, user: unknown) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured on the server.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 75_000);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000",
        "X-OpenRouter-Title": "AI Education",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL?.trim() || "openrouter/free",
        temperature: 0.45,
        max_tokens: 5_000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(user) },
        ],
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The AI provider timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `OpenRouter request failed (${response.status}).`;
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
      ? "The configured AI model is unavailable for this account. Check the OpenRouter model or credits."
      : message,
  });
}
