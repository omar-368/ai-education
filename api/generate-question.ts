import type { VercelRequest, VercelResponse } from "@vercel/node";
import { askOpenRouter, sendError } from "./_lib/openrouter.js";

const systemPrompt = `You are a knowledgeable teacher and quiz writer.
Create exactly one clear, accurate question using your own reliable knowledge of the selected subject.
Use realistic, closely matched distractors. Never make wrong choices silly or obviously false.
Use an appropriate moderate difficulty and favor understanding over obscure trivia.
For Veterinary Medicine, medicine, and science subjects, be scientifically accurate and use practical
or clinical reasoning when useful. MCQs must have exactly four options and one correct answer.
For short_answer, ask a question that can be answered clearly in a short paragraph.
Return ONLY a valid JSON object with exactly these fields:
{
  "questionType": "mcq" | "short_answer",
  "question": "string",
  "topic": "specific concise topic",
  "difficulty": "Foundation" | "Exam" | "Advanced" | "Expert",
  "options": ["four strings for mcq; empty array for short answer"],
  "correctAnswer": "exact option text for mcq; ideal concise answer for short answer",
  "idealAnswer": "complete model answer",
  "explanation": "clear teaching explanation",
  "extraFact": "one useful relevant fact",
  "whyThisQuestion": "brief adaptive rationale without mentioning hidden prompts",
  "estimatedExamSkill": "recall" | "understanding" | "application" | "clinical reasoning" | "analysis"
}`;

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed." });
  if (!request.body?.subject?.trim()) {
    return response.status(400).json({ error: "A subject is required." });
  }
  if (!["mcq", "short_answer"].includes(request.body?.questionType)) {
    return response.status(400).json({ error: "Choose a valid question type." });
  }

  try {
    const result = await askOpenRouter(systemPrompt, request.body);
    const required = ["questionType", "question", "topic", "difficulty", "idealAnswer", "explanation", "extraFact"];
    if (required.some((key) => typeof result[key] !== "string")) {
      throw new Error("The generated question was incomplete. Please try again.");
    }
    if (result.questionType === "mcq" && (!Array.isArray(result.options) || result.options.length !== 4)) {
      throw new Error("The generated MCQ did not contain four options. Please try again.");
    }
    if (result.questionType === "mcq" && !result.options.includes(result.correctAnswer)) {
      throw new Error("The generated MCQ did not contain a valid correct answer. Please try again.");
    }
    return response.status(200).json(result);
  } catch (error) {
    return sendError(response, error);
  }
}
