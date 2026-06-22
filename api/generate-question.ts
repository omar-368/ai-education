import type { VercelRequest, VercelResponse } from "@vercel/node";
import { askOpenRouter, sendError } from "./_lib/openrouter.js";

const systemPrompt = `You are an expert university examiner and adaptive learning coach.
Create exactly one difficult, exam-quality question grounded only in the supplied study material.
Use realistic, closely matched distractors. Never make wrong choices silly or obviously false.
Favor application, analysis, scientific reasoning, and clinical reasoning where relevant.
Honor the requested difficulty and focus topic. Use recent mistakes and weak topics to adapt.
If questionType is mixed, choose mcq or short_answer strategically. MCQs must have exactly four options.
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
  if (!request.body?.studyMaterial?.trim()) {
    return response.status(400).json({ error: "Study material is required." });
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
    return response.status(200).json(result);
  } catch (error) {
    return sendError(response, error);
  }
}
