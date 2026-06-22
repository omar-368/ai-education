import type { PlayerProfile, QuizSettings } from "../../types";

const SETTINGS_KEY = "ai-education-quiz-settings";
const PROFILE_KEY = "ai-education-player-profile";

function localDateKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const defaultSettings: QuizSettings = {
  subject: "Veterinary Medicine",
  customSubject: "",
  questionType: "mcq",
};

export const defaultProfile: PlayerProfile = {
  totalXp: 0,
  totalAnswered: 0,
  totalCorrect: 0,
  bestStreak: 0,
  dailyAnswered: 0,
  dailyDate: localDateKey(),
  achievements: [],
};

export const localStorageAdapter = {
  getSettings(): QuizSettings {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (!saved) return defaultSettings;
      const parsed = JSON.parse(saved) as Partial<QuizSettings>;
      return {
        subject:
          typeof parsed.subject === "string" ? parsed.subject : defaultSettings.subject,
        customSubject:
          typeof parsed.customSubject === "string" ? parsed.customSubject : "",
        questionType:
          parsed.questionType === "short_answer" ? "short_answer" : "mcq",
      };
    } catch {
      return defaultSettings;
    }
  },
  saveSettings(settings: QuizSettings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // The app remains usable if browser storage is unavailable or full.
    }
  },
  getProfile(): PlayerProfile {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (!saved) return defaultProfile;
      const parsed = JSON.parse(saved) as Partial<PlayerProfile>;
      const profile: PlayerProfile = {
        totalXp: Number.isFinite(parsed.totalXp) ? Math.max(0, Number(parsed.totalXp)) : 0,
        totalAnswered: Number.isFinite(parsed.totalAnswered)
          ? Math.max(0, Number(parsed.totalAnswered))
          : 0,
        totalCorrect: Number.isFinite(parsed.totalCorrect)
          ? Math.max(0, Number(parsed.totalCorrect))
          : 0,
        bestStreak: Number.isFinite(parsed.bestStreak)
          ? Math.max(0, Number(parsed.bestStreak))
          : 0,
        dailyAnswered: Number.isFinite(parsed.dailyAnswered)
          ? Math.max(0, Number(parsed.dailyAnswered))
          : 0,
        dailyDate: typeof parsed.dailyDate === "string" ? parsed.dailyDate : localDateKey(),
        achievements: Array.isArray(parsed.achievements)
          ? parsed.achievements.filter((item): item is string => typeof item === "string")
          : [],
      };
      const today = localDateKey();
      return profile.dailyDate === today
        ? profile
        : { ...profile, dailyDate: today, dailyAnswered: 0 };
    } catch {
      return defaultProfile;
    }
  },
  saveProfile(profile: PlayerProfile) {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // The current session remains usable without persistent storage.
    }
  },
};
