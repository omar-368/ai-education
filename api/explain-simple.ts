import type { VercelRequest, VercelResponse } from "@vercel/node";
import { askOpenRouter, sendError } from "./_lib/openrouter.js";

const systemPrompt = `Explain the supplied concept in very simple language as if teaching a curious
five-year-old, while remaining scientifically accurate. Use one short analogy when useful.
Do not be condescending. Return ONLY valid JSON: {"explanation":"two to four simple sentences"}`;

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed." });
  try {
    const result = await askOpenRouter(systemPrompt, request.body);
    if (typeof result.explanation !== "string") {
      throw new Error("The simple explanation was incomplete. Please try again.");
    }
    return response.status(200).json(result);
  } catch (error) {
    return sendError(response, error);
  }
}
