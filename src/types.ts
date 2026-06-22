export type DifficultyLevel = "Foundation" | "Exam" | "Advanced" | "Expert";
export type QuestionPreference = "mcq" | "short_answer" | "mixed";
export type AnswerResult = "correct" | "partial" | "incorrect";

export interface StudySet {
  id: string;
  title: string;
  subject: string;
  customSubject?: string;
  material: string;
  questionPreference: QuestionPreference;
  updatedAt: string;
}

export interface Question {
  id: string;
  questionType: "mcq" | "short_answer";
  question: string;
  topic: string;
  difficulty: DifficultyLevel;
  options?: string[];
  correctAnswer?: string;
  idealAnswer: string;
  explanation: string;
  extraFact: string;
  whyThisQuestion: string;
  estimatedExamSkill: string;
}

export interface GradeResponse {
  result: AnswerResult;
  score: number;
  feedback: string;
  idealAnswer: string;
  explanation: string;
  extraFact: string;
  missedConcepts: string[];
  weakTopic: string;
}

export interface AnswerRecord {
  id: string;
  question: Question;
  userAnswer: string;
  result: AnswerResult;
  score: number;
  feedback: string;
  answeredAt: string;
}

export interface WeakTopic {
  topic: string;
  correct: number;
  incorrect: number;
  partial: number;
  accuracy: number;
  lastMissedQuestion?: string;
  weaknessScore: number;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
  confidence: number;
  createdAt: string;
}

export interface UserProgress {
  totalAnswered: number;
  correct: number;
  partial: number;
  incorrect: number;
  accuracy: number;
  currentStreak: number;
  incorrectStreak: number;
  bestStreak: number;
  difficulty: DifficultyLevel;
  weakTopics: WeakTopic[];
  history: AnswerRecord[];
  flashcards: Flashcard[];
}

export type AppSection =
  | "dashboard"
  | "material"
  | "quiz"
  | "weak"
  | "flashcards"
  | "history"
  | "settings";
