"use client";

import { useEffect, useState } from "react";
import { questions } from "@/data/questions";

type Choice = "A" | "B" | "C";

type ShuffledChoice = {
  label: Choice;
  text: string;
  originalKey: Choice;
};

type QuizQuestion = {
  id: number;
  section: string;
  chapter: string;
  topic: string;
  question: string;
  answer: Choice;
  choices: {
    A: string;
    B: string;
    C: string;
  };
  shuffledChoices: ShuffledChoice[];
};

function shuffleArray<T>(array: T[]) {
  return [...array].sort(() => Math.random() - 0.5);
}

function buildQuizQuestions(): QuizQuestion[] {
  return shuffleArray(questions).map((question) => {
    const choiceItems: ShuffledChoice[] = [
      {
        label: "A",
        text: question.choices.A,
        originalKey: "A",
      },
      {
        label: "B",
        text: question.choices.B,
        originalKey: "B",
      },
      {
        label: "C",
        text: question.choices.C,
        originalKey: "C",
      },
    ];

    const shuffledChoices = shuffleArray(choiceItems).map((choice, index) => ({
      ...choice,
      label: ["A", "B", "C"][index] as Choice,
    }));

    return {
      ...question,
      shuffledChoices,
    };
  });
}

export default function Home() {
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOriginalAnswer, setSelectedOriginalAnswer] =
    useState<Choice | null>(null);
  const [selectedDisplayAnswer, setSelectedDisplayAnswer] =
    useState<Choice | null>(null);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    setQuizQuestions(buildQuizQuestions());
  }, []);

  if (quizQuestions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center font-sans text-white">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-300 border-t-transparent" />
          <h1 className="text-2xl font-bold">Loading Quiz</h1>
          <p className="mt-2 text-sm text-slate-300">
            Preparing randomized questions and answers...
          </p>
        </div>
      </div>
    );
  }

  const currentQuestion = quizQuestions[currentIndex];

  const totalQuestions = quizQuestions.length;
  const answeredCount = answered ? currentIndex + 1 : currentIndex;
  const progressPercent = ((currentIndex + 1) / totalQuestions) * 100;
  const scorePercent =
    answeredCount === 0 ? 0 : Math.round((score / answeredCount) * 100);

  const isLastQuestion = currentIndex === totalQuestions - 1;
  const isFinished = isLastQuestion && answered;

  const correctChoice = currentQuestion.shuffledChoices.find(
    (choice) => choice.originalKey === currentQuestion.answer
  );

  const correctDisplayChoice = correctChoice?.label ?? currentQuestion.answer;
  const correctDisplayText =
    correctChoice?.text ?? currentQuestion.choices[currentQuestion.answer];

  const handleAnswer = (displayChoice: Choice, originalChoice: Choice) => {
    if (answered) return;

    setSelectedDisplayAnswer(displayChoice);
    setSelectedOriginalAnswer(originalChoice);
    setAnswered(true);

    if (originalChoice === currentQuestion.answer) {
      setScore((prev) => prev + 1);
    } else {
      setWrong((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (!answered) return;

    setSelectedOriginalAnswer(null);
    setSelectedDisplayAnswer(null);
    setAnswered(false);

    if (!isLastQuestion) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleRestart = () => {
    setQuizQuestions(buildQuizQuestions());
    setCurrentIndex(0);
    setSelectedOriginalAnswer(null);
    setSelectedDisplayAnswer(null);
    setScore(0);
    setWrong(0);
    setAnswered(false);
  };

  if (isFinished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-4 py-10 font-sans text-white">
        <main className="mx-auto flex min-h-[85vh] max-w-4xl items-center justify-center">
          <section className="w-full rounded-3xl border border-white/10 bg-white/10 p-8 text-center shadow-2xl backdrop-blur">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-400/20 text-4xl">
              🎉
            </div>

            <h1 className="text-4xl font-bold tracking-tight">
              Practice Complete
            </h1>

            <p className="mt-3 text-slate-300">
              Here is your Tennessee learner&apos;s permit practice result.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-6 text-slate-900 shadow-lg">
                <p className="text-sm font-medium text-slate-500">Correct</p>
                <p className="mt-2 text-4xl font-bold text-green-600">
                  {score}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-6 text-slate-900 shadow-lg">
                <p className="text-sm font-medium text-slate-500">Incorrect</p>
                <p className="mt-2 text-4xl font-bold text-red-600">
                  {wrong}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-6 text-slate-900 shadow-lg">
                <p className="text-sm font-medium text-slate-500">Score</p>
                <p className="mt-2 text-4xl font-bold text-blue-600">
                  {scorePercent}%
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl bg-slate-950/60 p-5">
              <p className="text-lg font-semibold">
                Final Score: {score} / {totalQuestions}
              </p>

              <p className="mt-2 text-sm text-slate-300">
                {scorePercent >= 80
                  ? "Strong result. You are looking ready."
                  : scorePercent >= 60
                  ? "Good progress. Review the missed topics and try again."
                  : "Keep practicing. Focus on one chapter at a time."}
              </p>
            </div>

            <button
              onClick={handleRestart}
              className="mt-8 rounded-full bg-blue-500 px-8 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-400"
            >
              Restart With New Random Order
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-4 py-8 font-sans text-white">
      <main className="mx-auto max-w-5xl">
        <header className="mb-8">
          <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-300">
                Tennessee Permit Practice
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                Learner&apos;s Permit Quiz
              </h1>

              <p className="mt-2 text-sm text-slate-300">
                Questions and answer choices are randomized each session.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-white p-4 text-slate-900 shadow-lg">
                <p className="text-xs font-semibold text-slate-500">Correct</p>
                <p className="mt-1 text-2xl font-bold text-green-600">
                  {score}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4 text-slate-900 shadow-lg">
                <p className="text-xs font-semibold text-slate-500">Wrong</p>
                <p className="mt-1 text-2xl font-bold text-red-600">
                  {wrong}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4 text-slate-900 shadow-lg">
                <p className="text-xs font-semibold text-slate-500">Score</p>
                <p className="mt-1 text-2xl font-bold text-blue-600">
                  {scorePercent}%
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-3xl border border-white/10 bg-white p-6 text-slate-900 shadow-2xl md:p-8">
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-slate-500">
                  Question {currentIndex + 1} of {totalQuestions}
                </p>

                <p className="rounded-full bg-blue-50 px-4 py-1 text-sm font-semibold text-blue-700">
                  {Math.round(progressPercent)}%
                </p>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="mb-6 rounded-2xl bg-slate-100 p-5">
              <p className="text-sm font-semibold text-blue-700">
                {currentQuestion.chapter}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {currentQuestion.topic}
              </p>

              <h2 className="mt-5 text-2xl font-bold leading-snug text-slate-950">
                {currentQuestion.question}
              </h2>
            </div>

            <div className="space-y-4">
              {currentQuestion.shuffledChoices.map((choice) => {
                const isCorrect = choice.originalKey === currentQuestion.answer;
                const isSelected = selectedDisplayAnswer === choice.label;

                let buttonClass =
                  "w-full rounded-2xl border-2 p-5 text-left transition ";

                if (!answered) {
                  buttonClass +=
                    "border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50";
                } else if (isCorrect) {
                  buttonClass += "border-green-500 bg-green-50 text-green-800";
                } else if (isSelected && !isCorrect) {
                  buttonClass += "border-red-500 bg-red-50 text-red-800";
                } else {
                  buttonClass += "border-slate-200 bg-slate-50 text-slate-400";
                }

                return (
                  <button
                    key={`${currentQuestion.id}-${choice.label}`}
                    onClick={() =>
                      handleAnswer(choice.label, choice.originalKey)
                    }
                    className={buttonClass}
                  >
                    <div className="flex items-start gap-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                        {choice.label}
                      </span>

                      <span className="pt-1 text-base font-medium">
                        {choice.text}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {answered && (
              <div
                className={`mt-6 rounded-2xl p-5 ${
                  selectedOriginalAnswer === currentQuestion.answer
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-800"
                }`}
              >
                {selectedOriginalAnswer === currentQuestion.answer ? (
                  <p className="font-bold">Correct answer ✅</p>
                ) : (
                  <div>
                    <p className="font-bold">Incorrect answer</p>
                    <p className="mt-1">
                      Correct answer:{" "}
                      <span className="font-bold">
                        {correctDisplayChoice}. {correctDisplayText}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={handleRestart}
                className="rounded-full border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Restart Random
              </button>

              <button
                onClick={handleNext}
                disabled={!answered}
                className="rounded-full bg-blue-600 px-8 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {isLastQuestion ? "See Result" : "Next Question"}
              </button>
            </div>
          </div>

          <aside className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
            <h3 className="text-xl font-bold">Live Tally</h3>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-white p-5 text-slate-900">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Answered</p>
                  <p className="text-2xl font-bold">{answeredCount}</p>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Out of {totalQuestions} questions
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 text-slate-900">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Correct</p>
                  <p className="text-2xl font-bold text-green-600">{score}</p>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-green-500"
                    style={{
                      width:
                        answeredCount === 0
                          ? "0%"
                          : `${(score / answeredCount) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 text-slate-900">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Incorrect</p>
                  <p className="text-2xl font-bold text-red-600">{wrong}</p>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-red-500"
                    style={{
                      width:
                        answeredCount === 0
                          ? "0%"
                          : `${(wrong / answeredCount) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-blue-500 p-5 text-white">
                <p className="text-sm font-medium text-blue-100">
                  Current Accuracy
                </p>

                <p className="mt-1 text-4xl font-bold">{scorePercent}%</p>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}