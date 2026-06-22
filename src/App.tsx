import { useEffect, useState } from "react";
import {
  ArrowRight,
  BrainCircuit,
  Check,
  CircleHelp,
  LoaderCircle,
  Sparkles,
  X,
} from "lucide-react";
import { localStorageAdapter } from "./lib/storage/localStorageAdapter";
import type { GradeResponse, Question, QuizSettings } from "./types";

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

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }
  return data as T;
}

export default function App() {
  const [settings, setSettings] = useState<QuizSettings>(
    localStorageAdapter.getSettings,
  );
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<GradeResponse | null>(null);
  const [loading, setLoading] = useState<"question" | "grade" | "">("");
  const [error, setError] = useState("");

  useEffect(() => localStorageAdapter.saveSettings(settings), [settings]);

  const selectedSubject =
    settings.subject === "Custom Subject"
      ? settings.customSubject.trim()
      : settings.subject;

  function updateSettings(patch: Partial<QuizSettings>) {
    setSettings((current) => ({ ...current, ...patch }));
  }

  async function generateQuestion() {
    if (!selectedSubject) {
      setError("Enter a subject before starting the quiz.");
      return;
    }

    setLoading("question");
    setError("");
    setQuestion(null);
    setResult(null);
    setAnswer("");

    try {
      const generated = await postJson<Omit<Question, "id">>(
        "/api/generate-question",
        {
          subject: selectedSubject,
          questionType: settings.questionType,
        },
      );
      setQuestion({ ...generated, id: crypto.randomUUID() });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Question generation failed.",
      );
    } finally {
      setLoading("");
    }
  }

  async function submitAnswer() {
    if (!question || !answer.trim() || result) return;

    if (question.questionType === "mcq") {
      const correct = answer === question.correctAnswer;
      setResult({
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
      setResult(grade);
    } catch (caught) {
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
      </header>

      <section className="quiz-shell">
        {!question ? (
          <div className="setup-card">
            <span className="intro-icon">
              <Sparkles size={28} />
            </span>
            <p className="eyebrow">AI-POWERED QUIZ</p>
            <h1>What do you want to learn?</h1>
            <p className="subtitle">
              Choose a subject and let AI create questions for you.
            </p>

            <div className="field">
              <label htmlFor="subject">Subject</label>
              <select
                id="subject"
                value={settings.subject}
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

            {error && <div className="error-message">{error}</div>}

            <button
              className="primary-button start-button"
              onClick={() => void generateQuestion()}
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
          </div>
        ) : (
          <div className="question-card">
            <div className="question-header">
              <span>{selectedSubject}</span>
              <button className="change-button" onClick={() => setQuestion(null)}>
                Change quiz
              </button>
            </div>

            <div className="question-content">
              <span className="question-number">
                <CircleHelp size={18} /> Question
              </span>
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
                  disabled={!!result}
                />
              )}

              {!result ? (
                <>
                  {error && <div className="error-message">{error}</div>}
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
                </>
              ) : (
                <div className={`result-panel ${result.result}`}>
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
                    onClick={() => void generateQuestion()}
                    disabled={loading === "question"}
                  >
                    {loading === "question" ? (
                      <>
                        <LoaderCircle className="spin" size={20} /> Creating…
                      </>
                    ) : (
                      <>
                        Next Question <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
