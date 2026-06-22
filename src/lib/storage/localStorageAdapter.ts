import type { StudySet, UserProgress } from "../../types";

const STUDY_KEY = "ai-education-study-set";
const PROGRESS_KEY = "ai-education-progress";

export const defaultStudySet: StudySet = {
  id: crypto.randomUUID(),
  title: "",
  subject: "All",
  material: "",
  questionPreference: "mixed",
  updatedAt: new Date().toISOString(),
};

export const defaultProgress: UserProgress = {
  totalAnswered: 0,
  correct: 0,
  partial: 0,
  incorrect: 0,
  accuracy: 0,
  currentStreak: 0,
  incorrectStreak: 0,
  bestStreak: 0,
  difficulty: "Exam",
  weakTopics: [],
  history: [],
  flashcards: [],
};

function read<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? ({ ...fallback, ...JSON.parse(value) } as T) : fallback;
  } catch {
    return fallback;
  }
}

export const localStorageAdapter = {
  getStudySet: () => read(STUDY_KEY, defaultStudySet),
  saveStudySet: (studySet: StudySet) =>
    localStorage.setItem(STUDY_KEY, JSON.stringify(studySet)),
  getProgress: () => read(PROGRESS_KEY, defaultProgress),
  saveProgress: (progress: UserProgress) =>
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)),
  clearAll: () => {
    localStorage.removeItem(STUDY_KEY);
    localStorage.removeItem(PROGRESS_KEY);
  },
};
