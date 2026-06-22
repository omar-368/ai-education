const endpoint = "https://openrouter.ai/api/v1/chat/completions";

export async function askOpenRouter(system: string, user: unknown) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured on the server.");
  }

  const response = await fetch(endpoint, {
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
      model: process.env.OPENROUTER_MODEL || "openrouter/free",
      temperature: 0.55,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(user) },
      ],
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `OpenRouter request failed (${response.status}).`;
    throw new Error(message);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("The AI returned an empty response.");

  try {
    return JSON.parse(content.replace(/^```json\s*|\s*```$/g, "").trim());
  } catch {
    throw new Error("The AI response was not valid JSON. Please generate again.");
  }
}

export function sendError(response: { status: (code: number) => { json: (body: unknown) => void } }, error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  response.status(message.includes("not configured") ? 500 : 502).json({ error: message });
}
