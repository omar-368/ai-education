import type { AnswerResult, DifficultyLevel } from "../types";

const levels: DifficultyLevel[] = ["Foundation", "Exam", "Advanced", "Expert"];

export function updateDifficulty(
  current: DifficultyLevel,
  result: AnswerResult,
  correctStreak: number,
  incorrectStreak: number,
): DifficultyLevel {
  const index = levels.indexOf(current);
  if (result === "correct" && correctStreak > 0 && correctStreak % 3 === 0) {
    return levels[Math.min(index + 1, levels.length - 1)];
  }
  if (result === "incorrect" && incorrectStreak >= 2) {
    return levels[Math.max(index - 1, 0)];
  }
  return current;
}
