import type { VercelRequest, VercelResponse } from "@vercel/node";
import { askOpenRouter, sendError } from "./_lib/openrouter.js";

const systemPrompt = `You are a strict but constructive university examiner.
Grade the student's short answer against the question and ideal answer.
Reward correct reasoning even if wording differs. Mark partial when core knowledge is present but important
elements are missing. Keep feedback concise and educational.
Return ONLY valid JSON:
{
  "result": "correct" | "partial" | "incorrect",
  "score": 0-100,
  "feedback": "brief direct feedback",
  "idealAnswer": "complete ideal answer",
  "explanation": "why this is the right answer",
  "extraFact": "one relevant educational fact",
  "missedConcepts": ["specific concepts omitted or misunderstood"],
  "weakTopic": "specific topic, or empty string when correct"
}`;

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed." });
  if (!request.body?.question || !request.body?.userAnswer?.trim()) {
    return response.status(400).json({ error: "A question and answer are required." });
  }
  try {
    const result = await askOpenRouter(systemPrompt, request.body);
    if (!["correct", "partial", "incorrect"].includes(result.result) || typeof result.score !== "number") {
      throw new Error("The grading response was incomplete. Please submit again.");
    }
    return response.status(200).json(result);
  } catch (error) {
    return sendError(response, error);
  }
}
