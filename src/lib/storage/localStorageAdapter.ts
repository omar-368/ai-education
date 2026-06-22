import type { QuizSettings } from "../../types";

const SETTINGS_KEY = "ai-education-quiz-settings";

export const defaultSettings: QuizSettings = {
  subject: "Veterinary Medicine",
  customSubject: "",
  questionType: "mcq",
};

export const localStorageAdapter = {
  getSettings(): QuizSettings {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      return saved
        ? { ...defaultSettings, ...JSON.parse(saved) }
        : defaultSettings;
    } catch {
      return defaultSettings;
    }
  },
  saveSettings(settings: QuizSettings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },
};
