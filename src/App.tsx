import { useEffect, useRef, useState } from "react";
import {
  Award,
  ArrowRight,
  BrainCircuit,
  Check,
  CircleHelp,
  Crown,
  Flame,
  Keyboard,
  LoaderCircle,
  Star,
  Sparkles,
  Trophy,
  Zap,
  X,
} from "lucide-react";
import { localStorageAdapter } from "./lib/storage/localStorageAdapter";
import type { GradeResponse, PlayerProfile, Question, QuizSettings } from "./types";

const subjects = [
  "Veterinary Medicine",
  "Chemistry",
  "Biology",
  "History",
  "Anatomy",
  "Physiology",
  "Pathology",
  "Pharmacology",
  "Food Safety",
  "Public Health",
  "General Knowledge",
  "Custom Subject",
];

const achievements = [
  { id: "first-step", label: "First Step", detail: "Answer your first question", icon: "✦" },
  { id: "hot-streak", label: "On Fire", detail: "Reach a 3-answer streak", icon: "🔥" },
  { id: "level-two", label: "Level Up", detail: "Reach level 2", icon: "⚡" },
  { id: "daily-five", label: "Daily Quest", detail: "Answer 5 questions today", icon: "🏆" },
];

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Something went wrong. Please try again.");
    }
    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The AI took too long to respond. Please try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export default function App() {
  const [settings, setSettings] = useState<QuizSettings>(
    localStorageAdapter.getSettings,
  );
  const [profile, setProfile] = useState<PlayerProfile>(
    localStorageAdapter.getProfile,
  );
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<GradeResponse | null>(null);
  const [loading, setLoading] = useState<"question" | "grade" | "">("");
  const [error, setError] = useState("");
  const [xp, setXp] = useState(profile.totalXp);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [achievementToast, setAchievementToast] = useState<string | null>(null);
  const questionQueueRef = useRef<Question[]>([]);
  const refillPromiseRef = useRef<Promise<void> | null>(null);
  const recentQuestionsRef = useRef<string[]>([]);
  const quizSessionRef = useRef(0);
  const startingRef = useRef(false);
  const submittingRef = useRef(false);
  const advancingRef = useRef(false);

  useEffect(() => localStorageAdapter.saveSettings(settings), [settings]);
  useEffect(() => localStorageAdapter.saveProfile(profile), [profile]);
  useEffect(() => {
    if (!achievementToast) return;
    const timer = window.setTimeout(() => setAchievementToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [achievementToast]);

  const selectedSubject =
    settings.subject === "Custom Subject"
      ? settings.customSubject.trim()
      : settings.subject;
  const level = Math.floor(xp / 100) + 1;
  const levelProgress = xp % 100;
  const accuracy = answered ? Math.round((correctAnswers / answered) * 100) : 0;
  const dailyProgress = Math.min(profile.dailyAnswered, 5);
  const rank =
    level >= 10 ? "Mastermind" : level >= 7 ? "Scholar" : level >= 4 ? "Explorer" : "Rookie";

  function updateSettings(patch: Partial<QuizSettings>) {
    setSettings((current) => ({ ...current, ...patch }));
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!question || loading) return;
      const target = event.target as HTMLElement | null;
      const isInteractive =
        target instanceof HTMLButtonElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLInputElement;
      if (isInteractive) return;
      if (!result && question.questionType === "mcq" && /^[1-4]$/.test(event.key)) {
        const option = question.options?.[Number(event.key) - 1];
        if (option) setAnswer(option);
      }
      const shouldSubmit =
        event.key === "Enter" &&
        answer.trim() &&
        (question.questionType === "mcq" || event.ctrlKey || event.metaKey);
      if (!result && shouldSubmit) {
        event.preventDefault();
        void submitAnswer();
      }
      if (result && (event.key === "Enter" || event.key.toLowerCase() === "n")) {
        event.preventDefault();
        void showNextQuestion();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [answer, loading, question, result]);

  async function requestQuestionBatch(count: number) {
    const generated = await postJson<{
      questions: Omit<Question, "id">[];
    }>(
      "/api/generate-question",
      {
        subject: selectedSubject,
        questionType: settings.questionType,
        count,
        previousQuestions: [
          ...recentQuestionsRef.current,
          ...questionQueueRef.current.map((queued) => queued.question),
        ].slice(-12),
      },
    );
    return generated.questions.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
    }));
  }

  function refillQueue() {
    if (refillPromiseRef.current || questionQueueRef.current.length > 2) return;

    const session = quizSessionRef.current;
    const promise = requestQuestionBatch(4)
      .then((questions) => {
        if (quizSessionRef.current === session) {
          questionQueueRef.current.push(...questions);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (quizSessionRef.current === session) {
          refillPromiseRef.current = null;
        }
      });
    refillPromiseRef.current = promise;
  }

  function showQuestion(nextQuestion: Question) {
    submittingRef.current = false;
    advancingRef.current = false;
    recentQuestionsRef.current.push(nextQuestion.question);
    recentQuestionsRef.current = recentQuestionsRef.current.slice(-8);
    setQuestion(nextQuestion);
    setResult(null);
    setAnswer("");
    setError("");
    refillQueue();
  }

  async function startQuiz() {
    if (!selectedSubject || startingRef.current) {
      if (!selectedSubject) setError("Enter a subject before starting the quiz.");
      return;
    }
    if (selectedSubject.length > 100) {
      setError("Keep the subject name under 100 characters.");
      return;
    }

    startingRef.current = true;
    quizSessionRef.current += 1;
    questionQueueRef.current = [];
    refillPromiseRef.current = null;
    recentQuestionsRef.current = [];
    setStreak(0);
    setBestStreak(0);
    setAnswered(0);
    setCorrectAnswers(0);
    setQuestionNumber(1);
    setLoading("question");
    setError("");

    try {
      const questions = await requestQuestionBatch(4);
      const firstQuestion = questions.shift();
      if (!firstQuestion) throw new Error("No question was generated.");
      questionQueueRef.current = questions;
      showQuestion(firstQuestion);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Question generation failed.",
      );
    } finally {
      startingRef.current = false;
      setLoading("");
    }
  }

  async function showNextQuestion() {
    if (!question || advancingRef.current) return;
    advancingRef.current = true;
    setLoading("question");
    setError("");

    try {
      let nextQuestion = questionQueueRef.current.shift();
      const pendingRefill = refillPromiseRef.current;

      if (!nextQuestion && pendingRefill) {
        await pendingRefill;
        nextQuestion = questionQueueRef.current.shift();
      }
      if (!nextQuestion) {
        const questions = await requestQuestionBatch(4);
        nextQuestion = questions.shift();
        questionQueueRef.current.push(...questions);
      }
      if (!nextQuestion) throw new Error("No question was generated.");
      setQuestionNumber((current) => current + 1);
      showQuestion(nextQuestion);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Question generation failed.",
      );
    } finally {
      advancingRef.current = false;
      setLoading("");
    }
  }

  function changeQuiz() {
    quizSessionRef.current += 1;
    questionQueueRef.current = [];
    refillPromiseRef.current = null;
    recentQuestionsRef.current = [];
    setQuestion(null);
    setResult(null);
    setAnswer("");
    setError("");
    submittingRef.current = false;
    advancingRef.current = false;
    startingRef.current = false;
  }

  function applyResult(grade: GradeResponse) {
    const isCorrect = grade.result === "correct";
    const nextStreak = isCorrect ? streak + 1 : 0;
    const earnedXp =
      grade.result === "correct"
        ? 20 + Math.min(nextStreak * 2, 20)
        : grade.result === "partial"
          ? 10
          : 3;

    const nextXp = xp + earnedXp;
    const newlyUnlocked: string[] = [];
    if (profile.totalAnswered === 0) newlyUnlocked.push("first-step");
    if (nextStreak >= 3 && !profile.achievements.includes("hot-streak")) newlyUnlocked.push("hot-streak");
    if (Math.floor(nextXp / 100) + 1 >= 2 && !profile.achievements.includes("level-two")) newlyUnlocked.push("level-two");
    if (profile.dailyAnswered + 1 >= 5 && !profile.achievements.includes("daily-five")) newlyUnlocked.push("daily-five");

    setResult(grade);
    setXp(nextXp);
    setProfile((current) => ({
      ...current,
      totalXp: nextXp,
      totalAnswered: current.totalAnswered + 1,
      totalCorrect: current.totalCorrect + (isCorrect ? 1 : 0),
      bestStreak: Math.max(current.bestStreak, nextStreak),
      dailyAnswered: current.dailyAnswered + 1,
      achievements: [...new Set([...current.achievements, ...newlyUnlocked])],
    }));
    if (newlyUnlocked[0]) {
      setAchievementToast(
        achievements.find((item) => item.id === newlyUnlocked[0])?.label ?? "Achievement unlocked",
      );
    }
    setAnswered((current) => current + 1);
    setCorrectAnswers((current) => current + (isCorrect ? 1 : 0));
    setStreak(nextStreak);
    setBestStreak((current) => Math.max(current, nextStreak));
  }

  async function submitAnswer() {
    if (!question || !answer.trim() || result || submittingRef.current) return;
    submittingRef.current = true;

    if (question.questionType === "mcq") {
      const correct = answer === question.correctAnswer;
      applyResult({
        result: correct ? "correct" : "incorrect",
        score: correct ? 100 : 0,
        feedback: correct
          ? "That’s correct."
          : "That answer isn’t correct.",
        idealAnswer: question.idealAnswer,
        explanation: question.explanation,
        extraFact: question.extraFact,
        missedConcepts: correct ? [] : [question.topic],
        weakTopic: correct ? "" : question.topic,
      });
      return;
    }

    setLoading("grade");
    setError("");

    try {
      const grade = await postJson<GradeResponse>("/api/grade-answer", {
        question,
        userAnswer: answer,
      });
      applyResult(grade);
    } catch (caught) {
      submittingRef.current = false;
      setError(
        caught instanceof Error ? caught.message : "Answer grading failed.",
      );
    } finally {
      setLoading("");
    }
  }

  return (
    <main className="app">
      <header className="brand">
        <span className="brand-icon">
          <BrainCircuit size={25} />
        </span>
        <div>
          <strong>AI Education</strong>
          <span>Learn one question at a time</span>
        </div>
        {!question && (
          <div className="profile-pill">
            <span><Crown size={15} /></span>
            <div><small>LEVEL {level}</small><strong>{rank}</strong></div>
          </div>
        )}
        {question && (
          <div className="header-level">
            <span>LVL {level}</span>
            <div><i style={{ width: `${levelProgress}%` }} /></div>
            <strong>{xp} XP</strong>
          </div>
        )}
      </header>

      <section className="quiz-shell">
        {!question ? (
          <div className="setup-card">
            <div className="player-dashboard">
              <div className="player-rank">
                <span><Crown size={22} /></span>
                <div><small>YOUR RANK</small><strong>{rank}</strong></div>
              </div>
              <div className="player-level">
                <div><span>Level {level}</span><strong>{xp} XP</strong></div>
                <div className="player-progress"><i style={{ width: `${levelProgress}%` }} /></div>
                <small>{100 - levelProgress} XP to next level</small>
              </div>
            </div>
            <span className="intro-icon">
              <Sparkles size={28} />
            </span>
            <p className="eyebrow">AI-POWERED QUIZ</p>
            <h1>What do you want to learn?</h1>
            <p className="subtitle">
              Pick your arena, answer questions, and level up.
            </p>

            <div className="game-preview">
              <div><span><Zap size={18} /></span><strong>Earn XP</strong><small>with every answer</small></div>
              <div><span><Flame size={18} /></span><strong>Build streaks</strong><small>stay on a roll</small></div>
              <div><span><Trophy size={18} /></span><strong>Level up</strong><small>master your subject</small></div>
            </div>

            <div className="daily-quest">
              <span className="quest-icon"><Trophy size={21} /></span>
              <div>
                <div className="quest-title"><strong>Daily quest</strong><span>{dailyProgress}/5</span></div>
                <p>Answer 5 questions today</p>
                <div className="quest-track"><i style={{ width: `${dailyProgress * 20}%` }} /></div>
              </div>
            </div>

            <div className="field">
              <label htmlFor="subject">Subject</label>
              <select
                id="subject"
                value={settings.subject}
                disabled={loading === "question"}
                onChange={(event) =>
                  updateSettings({ subject: event.target.value })
                }
              >
                {subjects.map((subject) => (
                  <option key={subject}>{subject}</option>
                ))}
              </select>
            </div>

            {settings.subject === "Custom Subject" && (
              <div className="field custom-field">
                <label htmlFor="custom-subject">Enter subject</label>
                <input
                  id="custom-subject"
                  value={settings.customSubject}
                  maxLength={100}
                  disabled={loading === "question"}
                  onChange={(event) =>
                    updateSettings({ customSubject: event.target.value })
                  }
                  placeholder="e.g. Astronomy"
                  autoFocus
                />
              </div>
            )}

            <fieldset className="field">
              <legend>Question type</legend>
              <div className="type-options">
                <label
                  className={
                    settings.questionType === "mcq" ? "selected" : ""
                  }
                >
                  <input
                    type="radio"
                    name="question-type"
                    value="mcq"
                    checked={settings.questionType === "mcq"}
                    disabled={loading === "question"}
                    onChange={() => updateSettings({ questionType: "mcq" })}
                  />
                  <span className="radio-mark" />
                  <span>
                    <strong>MCQ</strong>
                    <small>Choose from four answers</small>
                  </span>
                </label>
                <label
                  className={
                    settings.questionType === "short_answer" ? "selected" : ""
                  }
                >
                  <input
                    type="radio"
                    name="question-type"
                    value="short_answer"
                    checked={settings.questionType === "short_answer"}
                    disabled={loading === "question"}
                    onChange={() =>
                      updateSettings({ questionType: "short_answer" })
                    }
                  />
                  <span className="radio-mark" />
                  <span>
                    <strong>One answer question</strong>
                    <small>Write your own answer</small>
                  </span>
                </label>
              </div>
            </fieldset>

            {error && <div className="error-message" role="alert">{error}</div>}

            <button
              className="primary-button start-button"
              onClick={() => void startQuiz()}
              disabled={loading === "question"}
            >
              {loading === "question" ? (
                <>
                  <LoaderCircle className="spin" size={20} /> Creating question…
                </>
              ) : (
                <>
                  Start Quiz <ArrowRight size={20} />
                </>
              )}
            </button>

            <div className="achievement-row">
              {achievements.map((achievement) => {
                const unlocked = profile.achievements.includes(achievement.id);
                return (
                  <div
                    key={achievement.id}
                    className={unlocked ? "unlocked" : ""}
                    title={`${achievement.label}: ${achievement.detail}`}
                    role="img"
                    aria-label={`${achievement.label}: ${achievement.detail}. ${
                      unlocked ? "Unlocked" : "Locked"
                    }`}
                  >
                    <span>{achievement.icon}</span>
                  </div>
                );
              })}
              <small>{profile.achievements.length}/{achievements.length} achievements</small>
            </div>
          </div>
        ) : (
          <div className="question-card">
            <div className="question-header">
              <div className="arena-label">
                <span className="live-dot" />
                <div><small>QUIZ ARENA</small><strong>{selectedSubject}</strong></div>
              </div>
              <div className="session-hud">
                <span className="hud-streak"><Flame size={16} /> {streak}</span>
                <span><Trophy size={16} /> {accuracy}%</span>
                <span><Star size={16} /> {xp} XP</span>
              </div>
              <button className="change-button" onClick={changeQuiz}>
                Exit
              </button>
            </div>

            <div className="question-content">
              <div className="question-topline">
                <span className="question-number">
                  <CircleHelp size={18} /> Question {questionNumber}
                </span>
                <span className="topic-chip">{question.topic}</span>
              </div>
              <h1>{question.question}</h1>

              {question.questionType === "mcq" ? (
                <div className="answer-options">
                  {question.options?.map((option, index) => {
                    const isCorrect = result && option === question.correctAnswer;
                    const isWrong =
                      result &&
                      option === answer &&
                      option !== question.correctAnswer;
                    return (
                      <button
                        key={option}
                        className={`${answer === option ? "selected" : ""} ${
                          isCorrect ? "correct" : ""
                        } ${isWrong ? "wrong" : ""}`}
                        onClick={() => !result && setAnswer(option)}
                        disabled={!!result}
                        aria-pressed={answer === option}
                      >
                        <span>{String.fromCharCode(65 + index)}</span>
                        {option}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Type your answer here…"
                  rows={5}
                  maxLength={4000}
                  disabled={!!result}
                />
              )}

              {!result ? (
                <>
                  {error && <div className="error-message" role="alert">{error}</div>}
                  <button
                    className="primary-button submit-button"
                    onClick={() => void submitAnswer()}
                    disabled={!answer.trim() || loading === "grade"}
                  >
                    {loading === "grade" ? (
                      <>
                        <LoaderCircle className="spin" size={20} /> Checking…
                      </>
                    ) : (
                      "Check Answer"
                    )}
                  </button>
                  <div className="keyboard-hint">
                    <Keyboard size={14} />
                    {question.questionType === "mcq"
                      ? "Press 1–4 to choose · Enter to submit"
                      : "Press Ctrl + Enter to submit"}
                  </div>
                </>
              ) : (
                <div className={`result-panel ${result.result}`} aria-live="polite">
                  <div className="xp-burst">
                    <Zap size={15} /> +
                    {result.result === "correct"
                      ? 20 + Math.min(streak * 2, 20)
                      : result.result === "partial"
                        ? 10
                        : 3} XP
                  </div>
                  <div className="result-heading">
                    <span className="result-icon">
                      {result.result === "correct" ? (
                        <Check size={22} />
                      ) : result.result === "partial" ? (
                        <Sparkles size={22} />
                      ) : (
                        <X size={22} />
                      )}
                    </span>
                    <div>
                      <strong>
                        {result.result === "partial"
                          ? "Partially correct"
                          : result.result === "correct"
                            ? "Correct"
                            : "Incorrect"}
                      </strong>
                      <p>{result.feedback}</p>
                    </div>
                  </div>

                  {result.result === "correct" && streak >= 2 && (
                    <div className="streak-callout">
                      <Flame size={19} /> {streak} answer streak — keep it going!
                    </div>
                  )}

                  <div className="result-section">
                    <span>Correct answer</span>
                    <p>{result.idealAnswer}</p>
                  </div>
                  <div className="result-section">
                    <span>Explanation</span>
                    <p>{result.explanation}</p>
                  </div>
                  <div className="fact">
                    <Sparkles size={18} />
                    <p>
                      <strong>Useful fact</strong>
                      {result.extraFact}
                    </p>
                  </div>

                  <button
                    className="primary-button next-button"
                    onClick={() => void showNextQuestion()}
                    disabled={loading === "question"}
                  >
                    {loading === "question" ? (
                      <>
                        <LoaderCircle className="spin" size={20} /> Preparing…
                      </>
                    ) : (
                      <>
                        Next Question <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                  <div className="keyboard-hint"><Keyboard size={14} /> Press N or Enter for next</div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
      {question && (
        <footer className="session-footer">
          <span><strong>{answered}</strong> answered</span>
          <span><strong>{correctAnswers}</strong> correct</span>
          <span><strong>{bestStreak}</strong> best streak</span>
        </footer>
      )}
      {achievementToast && (
        <div className="achievement-toast" role="status" aria-live="polite">
          <span><Award size={23} /></span>
          <div><small>ACHIEVEMENT UNLOCKED</small><strong>{achievementToast}</strong></div>
        </div>
      )}
    </main>
  );
}
