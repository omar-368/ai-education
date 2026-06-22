export type QuestionType = "mcq" | "short_answer";
export type AnswerResult = "correct" | "partial" | "incorrect";
export type DifficultyLevel = "Foundation" | "Exam" | "Advanced" | "Expert";

export interface QuizSettings {
  subject: string;
  customSubject: string;
  questionType: QuestionType;
}

export interface PlayerProfile {
  totalXp: number;
  totalAnswered: number;
  totalCorrect: number;
  bestStreak: number;
  dailyAnswered: number;
  dailyDate: string;
  achievements: string[];
}

export interface Question {
  id: string;
  questionType: QuestionType;
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
