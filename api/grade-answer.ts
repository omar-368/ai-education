import { askOpenRouter, sendError } from "./_lib/openrouter.js";
import {
  cleanText,
  prepareApiRequest,
  type ApiRequest,
  type ApiResponse,
} from "./_lib/request.js";

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

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (!prepareApiRequest(request, response)) return;
  const sourceQuestion = request.body?.question;
  const userAnswer = cleanText(request.body?.userAnswer, 4_000);
  if (!sourceQuestion || typeof sourceQuestion !== "object" || !userAnswer) {
    return response.status(400).json({ error: "A question and answer are required." });
  }
  const questionInput = sourceQuestion as Record<string, unknown>;
  const question = {
    question: cleanText(questionInput.question, 2_000),
    topic: cleanText(questionInput.topic, 200),
    idealAnswer: cleanText(questionInput.idealAnswer, 4_000),
    explanation: cleanText(questionInput.explanation, 4_000),
  };
  if (!question.question || !question.idealAnswer) {
    return response.status(400).json({ error: "The question data is incomplete." });
  }
  try {
    const result = await askOpenRouter(systemPrompt, { question, userAnswer });
    const validResult = ["correct", "partial", "incorrect"].includes(result.result);
    const validScore = typeof result.score === "number" && result.score >= 0 && result.score <= 100;
    const requiredStrings = ["feedback", "idealAnswer", "explanation", "extraFact", "weakTopic"];
    if (
      !validResult ||
      !validScore ||
      requiredStrings.some((key) => typeof result[key] !== "string") ||
      !Array.isArray(result.missedConcepts) ||
      !result.missedConcepts.every((item: unknown) => typeof item === "string")
    ) {
      throw new Error("The grading response was incomplete. Please submit again.");
    }
    return response.status(200).json(result);
  } catch (error) {
    return sendError(response, error);
  }
}
