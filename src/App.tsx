import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronRight,
  Flame,
  Menu,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { StatCard } from "./components/StatCard";
import { updateDifficulty } from "./lib/adaptiveDifficulty";
import {
  defaultProgress,
  defaultStudySet,
  localStorageAdapter,
} from "./lib/storage/localStorageAdapter";
import { updateWeakTopics } from "./lib/weakTopics";
import type {
  AnswerResult,
  AppSection,
  GradeResponse,
  Question,
  StudySet,
  UserProgress,
} from "./types";

const subjects = [
  "All", "Veterinary Medicine", "Chemistry", "History", "Biology", "Anatomy",
  "Physiology", "Pathology", "Pharmacology", "Public Health", "Food Safety", "Custom Subject",
];

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The study coach could not respond. Please try again.");
  return data as T;
}

export default function App() {
  const [section, setSection] = useState<AppSection>("dashboard");
  const [studySet, setStudySet] = useState<StudySet>(() => localStorageAdapter.getStudySet());
  const [progress, setProgress] = useState<UserProgress>(() => localStorageAdapter.getProgress());
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<GradeResponse | null>(null);
  const [simpleExplanation, setSimpleExplanation] = useState("");
  const [focusTopic, setFocusTopic] = useState("");
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [showCardBack, setShowCardBack] = useState(false);

  useEffect(() => localStorageAdapter.saveStudySet(studySet), [studySet]);
  useEffect(() => localStorageAdapter.saveProgress(progress), [progress]);

  const subject = studySet.subject === "Custom Subject"
    ? studySet.customSubject || "Custom Subject"
    : studySet.subject;
  const weakest = progress.weakTopics[0];
  const accuracy = progress.totalAnswered ? progress.accuracy : 0;

  const recentAnswers = useMemo(
    () => progress.history.slice(0, 5).map((item) => ({
      question: item.question.question,
      topic: item.question.topic,
      result: item.result,
    })),
    [progress.history],
  );

  function updateStudy(patch: Partial<StudySet>) {
    setStudySet((current) => ({ ...current, ...patch, updatedAt: new Date().toISOString() }));
  }

  async function generateQuestion(topic = focusTopic) {
    if (!studySet.material.trim()) {
      setError("Add some study material before generating a question.");
      setSection("material");
      return;
    }
    setLoading("question");
    setError("");
    setResult(null);
    setAnswer("");
    setSimpleExplanation("");
    try {
      const generated = await postJson<Omit<Question, "id">>("/api/generate-question", {
        studyMaterial: studySet.material,
        subject,
        questionType: studySet.questionPreference,
        difficulty: progress.difficulty,
        recentAnswers,
        weakTopics: progress.weakTopics.slice(0, 5),
        currentStreak: progress.currentStreak,
        lastMistakes: progress.history.filter((item) => item.result !== "correct").slice(0, 3),
        focusTopic: topic || undefined,
      });
      setQuestion({ ...generated, id: crypto.randomUUID() });
      setFocusTopic("");
      setSection("quiz");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Question generation failed.");
    } finally {
      setLoading("");
    }
  }

  function recordResult(grade: GradeResponse) {
    if (!question) return;
    const nextCorrectStreak = grade.result === "correct" ? progress.currentStreak + 1 : 0;
    const nextIncorrectStreak = grade.result === "incorrect" ? progress.incorrectStreak + 1 : 0;
    const correct = progress.correct + (grade.result === "correct" ? 1 : 0);
    const partial = progress.partial + (grade.result === "partial" ? 1 : 0);
    const incorrect = progress.incorrect + (grade.result === "incorrect" ? 1 : 0);
    const total = progress.totalAnswered + 1;
    const record = {
      id: crypto.randomUUID(),
      question,
      userAnswer: answer,
      result: grade.result,
      score: grade.score,
      feedback: grade.feedback,
      answeredAt: new Date().toISOString(),
    };
    const card = {
      id: crypto.randomUUID(),
      front: question.question,
      back: grade.idealAnswer || question.explanation,
      topic: question.topic,
      confidence: 0,
      createdAt: new Date().toISOString(),
    };
    setProgress((current) => ({
      ...current,
      totalAnswered: total,
      correct,
      partial,
      incorrect,
      accuracy: Math.round(((correct + partial * 0.5) / total) * 100),
      currentStreak: nextCorrectStreak,
      incorrectStreak: nextIncorrectStreak,
      bestStreak: Math.max(current.bestStreak, nextCorrectStreak),
      difficulty: updateDifficulty(
        current.difficulty,
        grade.result,
        nextCorrectStreak,
        nextIncorrectStreak,
      ),
      weakTopics: updateWeakTopics(current.weakTopics, question.topic, grade.result, question.question),
      history: [record, ...current.history].slice(0, 100),
      flashcards: [card, ...current.flashcards],
    }));
    setResult(grade);
  }

  async function submitAnswer() {
    if (!question || !answer.trim() || result) return;
    if (question.questionType === "mcq") {
      const correct = answer === question.correctAnswer;
      recordResult({
        result: correct ? "correct" : "incorrect",
        score: correct ? 100 : 0,
        feedback: correct ? "Excellent choice." : `The correct answer is ${question.correctAnswer}.`,
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
        studyMaterial: studySet.material,
      });
      recordResult(grade);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Answer grading failed.");
    } finally {
      setLoading("");
    }
  }

  async function explainSimply() {
    if (!question || !result) return;
    setLoading("simple");
    setError("");
    try {
      const data = await postJson<{ explanation: string }>("/api/explain-simple", {
        topic: question.topic,
        question: question.question,
        answer: result.idealAnswer,
        explanation: result.explanation,
      });
      setSimpleExplanation(data.explanation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simple explanation failed.");
    } finally {
      setLoading("");
    }
  }

  function trainTopic(topic: string) {
    setFocusTopic(topic);
    void generateQuestion(topic);
  }

  function rateFlashcard(delta: number) {
    const card = progress.flashcards[flashcardIndex];
    if (!card) return;
    setProgress((current) => ({
      ...current,
      flashcards: current.flashcards.map((item) =>
        item.id === card.id ? { ...item, confidence: Math.max(0, item.confidence + delta) } : item,
      ),
    }));
    setShowCardBack(false);
    setFlashcardIndex((index) => (index + 1) % progress.flashcards.length);
  }

  function resetProgress() {
    if (!window.confirm("Reset all scores, history, weak topics, and flashcards?")) return;
    setProgress(defaultProgress);
    setQuestion(null);
    setResult(null);
  }

  return (
    <div className="app-shell">
      <Sidebar active={section} onNavigate={setSection} open={menuOpen} onClose={() => setMenuOpen(false)} />
      {menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} aria-label="Close menu" />}
      <main>
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setMenuOpen(true)}><Menu /></button>
          <div>
            <span className="eyebrow">PERSONAL STUDY SPACE</span>
            <h1>{section === "dashboard" ? "Ready to level up?" : sectionLabel(section)}</h1>
          </div>
          <div className="topbar-actions">
            <span className="streak-pill"><Flame size={17} /> {progress.currentStreak} day streak</span>
            <div className="avatar">S</div>
          </div>
        </header>

        {error && <div className="error-banner"><span>{error}</span><button onClick={() => setError("")}><X size={18} /></button></div>}

        {section === "dashboard" && (
          <div className="page">
            <section className="hero">
              <div>
                <span className="hero-badge"><Sparkles size={15} /> ADAPTIVE LEARNING</span>
                <h2>Turn your notes into an<br /><em>exam-training arena.</em></h2>
                <p>Your AI coach learns what you know, spots what you miss, and makes every next question count.</p>
                <div className="button-row">
                  <button className="primary" onClick={() => void generateQuestion()} disabled={loading === "question"}>
                    <Zap size={18} /> {loading === "question" ? "Building question..." : "Start a quiz"}
                  </button>
                  <button className="secondary" onClick={() => setSection("material")}><BookOpen size={18} /> Edit study set</button>
                </div>
              </div>
              <div className="hero-orbit">
                <div className="brain-bubble"><BrainCircuit size={58} /></div>
                <span className="orbit-chip chip-one">+XP</span>
                <span className="orbit-chip chip-two"><Target size={17} /> Focus</span>
                <span className="orbit-chip chip-three"><Trophy size={17} /></span>
              </div>
            </section>

            <section className="stats-grid">
              <StatCard icon={Target} label="Accuracy" value={`${accuracy}%`} detail={`${progress.totalAnswered} answers`} tone="purple" />
              <StatCard icon={Flame} label="Current streak" value={progress.currentStreak} detail={`Best: ${progress.bestStreak}`} tone="orange" />
              <StatCard icon={Award} label="Difficulty" value={progress.difficulty} detail="Adapts automatically" tone="blue" />
              <StatCard icon={BrainCircuit} label="Flashcards" value={progress.flashcards.length} detail="Ready to review" tone="green" />
            </section>

            <section className="dashboard-grid">
              <article className="panel current-set">
                <div className="panel-heading"><div><span className="eyebrow">CURRENT STUDY SET</span><h3>{studySet.title || "Untitled study set"}</h3></div><button className="text-button" onClick={() => setSection("material")}>Edit <ChevronRight size={16} /></button></div>
                <p>{studySet.material ? `${studySet.material.slice(0, 170)}${studySet.material.length > 170 ? "…" : ""}` : "Add notes to begin your adaptive study session."}</p>
                <div className="tag-row"><span>{subject}</span><span>{studySet.questionPreference.replace("_", " ")}</span><span>{studySet.material.split(/\s+/).filter(Boolean).length} words</span></div>
              </article>
              <article className="panel weak-preview">
                <div className="panel-heading"><div><span className="eyebrow">SMART FOCUS</span><h3>Weakest topic</h3></div><Target size={23} /></div>
                {weakest ? (
                  <>
                    <div className="topic-line"><strong>{weakest.topic}</strong><span>{weakest.accuracy}% accuracy</span></div>
                    <div className="progress-track"><i style={{ width: `${weakest.accuracy}%` }} /></div>
                    <button className="secondary full" onClick={() => trainTopic(weakest.topic)}>Train this topic</button>
                  </>
                ) : <p>Answer a few questions and your coach will identify where to focus.</p>}
              </article>
            </section>
          </div>
        )}

        {section === "material" && (
          <div className="page narrow">
            <section className="panel form-panel">
              <div className="section-intro"><span className="section-icon purple"><BookOpen /></span><div><h2>Build your study set</h2><p>Paste notes, a chapter summary, or lecture material. It stays in this browser.</p></div></div>
              <label>Study set title<input value={studySet.title} onChange={(e) => updateStudy({ title: e.target.value })} placeholder="e.g. Veterinary Pathology — Midterm" /></label>
              <div className="two-columns">
                <label>Subject<select value={studySet.subject} onChange={(e) => updateStudy({ subject: e.target.value })}>{subjects.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Question style<select value={studySet.questionPreference} onChange={(e) => updateStudy({ questionPreference: e.target.value as StudySet["questionPreference"] })}><option value="mixed">Mixed</option><option value="mcq">MCQ</option><option value="short_answer">Short answer</option></select></label>
              </div>
              {studySet.subject === "Custom Subject" && <label>Custom subject<input value={studySet.customSubject || ""} onChange={(e) => updateStudy({ customSubject: e.target.value })} placeholder="Enter your subject" /></label>}
              <label>Study material<textarea value={studySet.material} onChange={(e) => updateStudy({ material: e.target.value })} rows={15} placeholder="Paste your study material here…" /></label>
              <div className="form-footer"><span>{studySet.material.split(/\s+/).filter(Boolean).length} words · saved automatically</span><button className="primary" onClick={() => void generateQuestion()} disabled={loading === "question"}><Sparkles size={18} /> Generate first question</button></div>
            </section>
          </div>
        )}

        {section === "quiz" && (
          <div className="page quiz-page">
            <div className="quiz-status">
              <span className="difficulty-badge">{progress.difficulty}</span>
              <span><Flame size={17} /> {progress.currentStreak} streak</span>
              {focusTopic && <span><Target size={17} /> {focusTopic}</span>}
            </div>
            {!question ? (
              <section className="empty-state panel">
                <div className="empty-icon"><BrainCircuit size={48} /></div>
                <h2>Your quiz arena is ready</h2>
                <p>Questions will adapt to your accuracy, streak, and weak topics.</p>
                <button className="primary" onClick={() => void generateQuestion()} disabled={loading === "question"}><Sparkles size={18} /> {loading === "question" ? "Generating..." : "Generate question"}</button>
              </section>
            ) : (
              <section className="question-layout">
                <article className="panel question-card">
                  <div className="question-meta"><span>{question.questionType === "mcq" ? "MULTIPLE CHOICE" : "SHORT ANSWER"}</span><span>{question.topic}</span><span>{question.estimatedExamSkill}</span></div>
                  <h2>{question.question}</h2>
                  {question.questionType === "mcq" ? (
                    <div className="options">
                      {question.options?.map((option, index) => (
                        <button
                          key={option}
                          className={`${answer === option ? "selected" : ""} ${result && option === question.correctAnswer ? "correct" : ""} ${result && answer === option && option !== question.correctAnswer ? "wrong" : ""}`}
                          onClick={() => !result && setAnswer(option)}
                        >
                          <span>{String.fromCharCode(65 + index)}</span>{option}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <textarea className="answer-box" value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={!!result} rows={6} placeholder="Write a focused, exam-style answer…" />
                  )}
                  {!result ? (
                    <button className="primary submit-answer" onClick={() => void submitAnswer()} disabled={!answer.trim() || loading === "grade"}>{loading === "grade" ? "AI is grading…" : "Submit answer"} <ChevronRight size={18} /></button>
                  ) : (
                    <div className={`result-card ${result.result}`}>
                      <div className="result-title"><span>{result.result === "correct" ? <Check /> : result.result === "partial" ? <Award /> : <X />}</span><div><strong>{result.result === "partial" ? "Partially correct" : result.result}</strong><small>{result.score}% score</small></div></div>
                      <p>{result.feedback}</p>
                      <h4>Explanation</h4><p>{result.explanation}</p>
                      <h4>Ideal answer</h4><p>{result.idealAnswer}</p>
                      <div className="fact-box"><Sparkles size={17} /><span><strong>Extra fact:</strong> {result.extraFact}</span></div>
                      {simpleExplanation && <div className="simple-box"><strong>Explain like I’m 5</strong><p>{simpleExplanation}</p></div>}
                      <div className="button-row">
                        <button className="secondary" onClick={() => void explainSimply()} disabled={loading === "simple"}>{loading === "simple" ? "Simplifying…" : "Explain like I’m 5"}</button>
                        <button className="primary" onClick={() => void generateQuestion()} disabled={loading === "question"}>Next question <ChevronRight size={18} /></button>
                      </div>
                    </div>
                  )}
                </article>
                <aside className="panel coach-card">
                  <span className="eyebrow">WHY THIS QUESTION?</span>
                  <p>{question.whyThisQuestion}</p>
                  <div className="mini-stat"><span>Current level</span><strong>{question.difficulty}</strong></div>
                  <div className="mini-stat"><span>Skill tested</span><strong>{question.estimatedExamSkill}</strong></div>
                </aside>
              </section>
            )}
          </div>
        )}

        {section === "weak" && (
          <div className="page">
            <div className="section-intro"><span className="section-icon orange"><Target /></span><div><h2>Your focus map</h2><p>Topics with the highest weakness score appear first.</p></div></div>
            <div className="topic-grid">
              {progress.weakTopics.length ? progress.weakTopics.map((topic) => (
                <article className="panel topic-card" key={topic.topic}>
                  <div className="topic-line"><h3>{topic.topic}</h3><span>{topic.accuracy}%</span></div>
                  <div className="progress-track"><i style={{ width: `${topic.accuracy}%` }} /></div>
                  <div className="topic-stats"><span><Check size={15} /> {topic.correct} correct</span><span><X size={15} /> {topic.incorrect} missed</span></div>
                  {topic.lastMissedQuestion && <p className="last-missed">Last missed: {topic.lastMissedQuestion}</p>}
                  <button className="secondary full" onClick={() => trainTopic(topic.topic)}><Target size={17} /> Train weak topic</button>
                </article>
              )) : <EmptyCopy text="No weak topics yet. Complete a quiz to reveal your focus map." />}
            </div>
          </div>
        )}

        {section === "flashcards" && (
          <div className="page narrow">
            <div className="section-intro"><span className="section-icon blue"><RotateCcw /></span><div><h2>Flashcard review</h2><p>Every answered question automatically becomes a review card.</p></div></div>
            {progress.flashcards.length ? (
              <>
                <div className="card-counter">Card {flashcardIndex + 1} of {progress.flashcards.length}</div>
                <button className={`flashcard ${showCardBack ? "flipped" : ""}`} onClick={() => setShowCardBack(!showCardBack)}>
                  <span>{showCardBack ? "ANSWER" : progress.flashcards[flashcardIndex].topic}</span>
                  <strong>{showCardBack ? progress.flashcards[flashcardIndex].back : progress.flashcards[flashcardIndex].front}</strong>
                  <small>{showCardBack ? "How well did you know it?" : "Click to reveal answer"}</small>
                </button>
                {showCardBack && <div className="flash-actions"><button className="danger-soft" onClick={() => rateFlashcard(-1)}>I missed this</button><button className="success-soft" onClick={() => rateFlashcard(1)}>I knew this</button></div>}
              </>
            ) : <EmptyCopy text="Your flashcards will appear here after you answer questions." />}
          </div>
        )}

        {section === "history" && (
          <div className="page">
            <div className="section-intro"><span className="section-icon green"><Trophy /></span><div><h2>Question history</h2><p>Your latest 100 answers, newest first.</p></div></div>
            <div className="history-list">
              {progress.history.length ? progress.history.map((item) => (
                <article className="panel history-item" key={item.id}>
                  <span className={`result-dot ${item.result}`} />
                  <div><strong>{item.question.question}</strong><p>{item.question.topic} · Your answer: {item.userAnswer}</p></div>
                  <div className="history-score"><strong>{item.score}%</strong><span>{new Date(item.answeredAt).toLocaleDateString()}</span></div>
                </article>
              )) : <EmptyCopy text="No history yet. Your completed questions will be saved here." />}
            </div>
          </div>
        )}

        {section === "settings" && (
          <div className="page narrow">
            <section className="panel form-panel">
              <div className="section-intro"><span className="section-icon purple"><Sparkles /></span><div><h2>Settings</h2><p>AI credentials are managed securely on the server, never in this browser.</p></div></div>
              <div className="setting-row"><div><strong>Adaptive difficulty</strong><p>Starts at Exam and shifts based on your answer streaks.</p></div><span className="status-on">Always on</span></div>
              <div className="setting-row"><div><strong>Local persistence</strong><p>Notes and progress are stored only in this browser.</p></div><span className="status-on">Active</span></div>
              <div className="danger-zone"><div><strong>Reset study progress</strong><p>Removes scores, weak topics, history, and flashcards. Your notes stay.</p></div><button className="danger-soft" onClick={resetProgress}>Reset progress</button></div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyCopy({ text }: { text: string }) {
  return <div className="empty-copy"><BrainCircuit size={38} /><p>{text}</p></div>;
}

function sectionLabel(section: AppSection) {
  const labels: Record<AppSection, string> = {
    dashboard: "Dashboard",
    material: "Study Material",
    quiz: "Quiz Arena",
    weak: "Weak Topics",
    flashcards: "Flashcards",
    history: "History",
    settings: "Settings",
  };
  return labels[section];
}
