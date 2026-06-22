import type { AnswerResult, WeakTopic } from "../types";

export function updateWeakTopics(
  topics: WeakTopic[],
  topic: string,
  result: AnswerResult,
  question: string,
): WeakTopic[] {
  const existing = topics.find((item) => item.topic.toLowerCase() === topic.toLowerCase());
  const next = existing
    ? { ...existing }
    : { topic, correct: 0, incorrect: 0, partial: 0, accuracy: 0, weaknessScore: 0 };

  if (result === "correct") next.correct += 1;
  if (result === "partial") next.partial += 1;
  if (result === "incorrect") next.incorrect += 1;
  if (result !== "correct") next.lastMissedQuestion = question;

  const total = next.correct + next.partial + next.incorrect;
  next.accuracy = Math.round(((next.correct + next.partial * 0.5) / total) * 100);
  next.weaknessScore = Math.round((100 - next.accuracy) * Math.log2(total + 1));

  return [...topics.filter((item) => item !== existing), next].sort(
    (a, b) => b.weaknessScore - a.weaknessScore,
  );
}
