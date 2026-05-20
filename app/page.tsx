"use client";

import { useEffect, useState } from "react";
import { questions } from "@/data/questions";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

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
  choices: { A: string; B: string; C: string };
  shuffledChoices: ShuffledChoice[];
};

type ProgressPayload = {
  quizQuestions?: QuizQuestion[];
  currentIndex?: number;
  score?: number;
  wrong?: number;
  answered?: boolean;
  selectedOriginalAnswer?: Choice | null;
  selectedDisplayAnswer?: Choice | null;
};

type AuthScreen = "signin" | "signup" | "forgot" | "forgot-sent";

function shuffleArray<T>(array: T[]) {
  return [...array].sort(() => Math.random() - 0.5);
}

function buildQuizQuestion(question: (typeof questions)[number]): QuizQuestion {
  const choiceItems: ShuffledChoice[] = [
    { label: "A", text: question.choices.A, originalKey: "A" },
    { label: "B", text: question.choices.B, originalKey: "B" },
    { label: "C", text: question.choices.C, originalKey: "C" },
  ];
  const shuffledChoices = shuffleArray(choiceItems).map((choice, index) => ({
    ...choice,
    label: ["A", "B", "C"][index] as Choice,
  }));
  return { ...question, shuffledChoices };
}

function buildQuizQuestions(): QuizQuestion[] {
  return shuffleArray(questions).map(buildQuizQuestion);
}

function syncQuizQuestions(savedQuiz: QuizQuestion[]): QuizQuestion[] {
  if (savedQuiz.length === 0) return buildQuizQuestions();

  const latestById = new Map(questions.map((question) => [question.id, question]));
  const savedIds = new Set<number>();

  const syncedSaved = savedQuiz.flatMap((savedQuestion) => {
    const latestQuestion = latestById.get(savedQuestion.id);
    if (!latestQuestion) return [];

    savedIds.add(savedQuestion.id);

    const savedChoices = Array.isArray(savedQuestion.shuffledChoices)
      ? savedQuestion.shuffledChoices
      : [];
    const hasValidSavedOrder =
      savedChoices.length === 3 &&
      savedChoices.every((choice) => ["A", "B", "C"].includes(choice.originalKey));

    const shuffledChoices = hasValidSavedOrder
      ? savedChoices.map((choice) => ({
          label: choice.label,
          originalKey: choice.originalKey,
          text: latestQuestion.choices[choice.originalKey],
        }))
      : buildQuizQuestion(latestQuestion).shuffledChoices;

    return [{ ...latestQuestion, shuffledChoices }];
  });

  const newQuestions = questions
    .filter((question) => !savedIds.has(question.id))
    .map(buildQuizQuestion);

  return [...syncedSaved, ...shuffleArray(newQuestions)];
}

function getAuthRedirectUrl(path = "") {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const siteUrl =
    configuredSiteUrl ||
    (typeof window !== "undefined" ? window.location.origin : "");

  return `${siteUrl}${path}`;
}

// ── Background orbs ────────────────────────────────────────────────────────
function BgOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="absolute top-1/2 -right-40 h-[500px] w-[500px] rounded-full bg-violet-600/15 blur-[120px]" />
      <div className="absolute -bottom-40 left-1/3 h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-[100px]" />
    </div>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────
function Spinner({ message }: { message: string }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#060812] px-4">
      <BgOrbs />
      <div className="relative flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur-xl">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-400" />
          <div className="absolute inset-1 animate-spin rounded-full border-2 border-transparent border-t-violet-400 [animation-direction:reverse] [animation-duration:0.8s]" />
        </div>
        <p className="text-sm font-medium text-slate-400">{message}</p>
      </div>
    </div>
  );
}

// ── Stat pill ──────────────────────────────────────────────────────────────
function StatPill({
  label,
  value,
  gradient,
}: {
  label: string;
  value: string | number;
  gradient: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-white/10 bg-white/5 px-5 py-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
        {label}
      </span>
      <span
        className={`mt-0.5 bg-gradient-to-r bg-clip-text text-2xl font-bold text-transparent ${gradient}`}
      >
        {value}
      </span>
    </div>
  );
}

// ── Mini progress bar ──────────────────────────────────────────────────────
function MiniBar({
  percent,
  gradient = "from-blue-500 to-violet-500",
}: {
  percent: number;
  gradient?: string;
}) {
  return (
    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${gradient}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authScreen, setAuthScreen] = useState<AuthScreen>("signin");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [progressLoading, setProgressLoading] = useState(false);
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
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setAuthLoading(false);
    };
    loadUser();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadProgress = async () => {
      if (authLoading) return;
      if (!user) { setProgressLoading(false); return; }
      setProgressLoading(true);
      const { data, error } = await supabase
        .from("quiz_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) console.error("Load progress error:", error.message);
      if (data) {
        const savedQuiz = Array.isArray(data.quiz_questions)
          ? (data.quiz_questions as QuizQuestion[])
          : [];
        const safeQuiz = syncQuizQuestions(savedQuiz);
        const safeCurrentIndex = Math.min(data.current_index ?? 0, safeQuiz.length - 1);
        setQuizQuestions(safeQuiz);
        setCurrentIndex(safeCurrentIndex);
        setScore(data.score ?? 0);
        setWrong(data.wrong ?? 0);
        setAnswered(data.answered ?? false);
        setSelectedOriginalAnswer((data.selected_original_answer as Choice | null) ?? null);
        setSelectedDisplayAnswer((data.selected_display_answer as Choice | null) ?? null);
        if (safeQuiz.length !== savedQuiz.length || safeCurrentIndex !== data.current_index) {
          const { error: syncError } = await supabase
            .from("quiz_progress")
            .upsert(
              {
                user_id: user.id,
                quiz_questions: safeQuiz,
                current_index: safeCurrentIndex,
                score: data.score ?? 0,
                wrong: data.wrong ?? 0,
                answered: data.answered ?? false,
                selected_original_answer: data.selected_original_answer ?? null,
                selected_display_answer: data.selected_display_answer ?? null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" }
            );
          if (syncError) console.error("Sync questions error:", syncError.message);
        }
      } else {
        const freshQuiz = buildQuizQuestions();
        setQuizQuestions(freshQuiz);
        setCurrentIndex(0); setScore(0); setWrong(0); setAnswered(false);
        setSelectedOriginalAnswer(null); setSelectedDisplayAnswer(null);
        const { error: insertError } = await supabase
          .from("quiz_progress")
          .upsert(
            {
              user_id: user.id, quiz_questions: freshQuiz, current_index: 0,
              score: 0, wrong: 0, answered: false,
              selected_original_answer: null, selected_display_answer: null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
        if (insertError) console.error("Create progress error:", insertError.message);
      }
      setProgressLoading(false);
    };
    loadProgress();
  }, [user, authLoading]);

  const saveProgress = async (nextProgress?: ProgressPayload) => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      quiz_questions: nextProgress?.quizQuestions ?? quizQuestions,
      current_index: nextProgress?.currentIndex ?? currentIndex,
      score: nextProgress?.score ?? score,
      wrong: nextProgress?.wrong ?? wrong,
      answered: nextProgress?.answered ?? answered,
      selected_original_answer: nextProgress?.selectedOriginalAnswer ?? selectedOriginalAnswer,
      selected_display_answer: nextProgress?.selectedDisplayAnswer ?? selectedDisplayAnswer,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("quiz_progress")
      .upsert(payload, { onConflict: "user_id" });
    if (error) console.error("Save progress error:", error.message);
  };

  const handleSignIn = async () => {
    setAuthMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password.trim()) { setAuthMessage("Enter your email and password."); return; }
    setAuthSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    setAuthSubmitting(false);
    if (error) { setAuthMessage(error.message); return; }
    setEmail(normalizedEmail);
    setPassword("");
  };

  const handleSignUp = async () => {
    setAuthMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password.trim()) { setAuthMessage("Enter your email and password."); return; }
    if (password.length < 6) { setAuthMessage("Password must be at least 6 characters."); return; }
    setAuthSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });
    setAuthSubmitting(false);
    if (error) { setAuthMessage(error.message); return; }
    setEmail(normalizedEmail);
    setPassword("");
    if (data.user && data.user.identities?.length === 0) {
      setAuthMessage("That email may already have an account. Try signing in, or use Forgot password.");
    } else if (data.session) {
      setAuthMessage("Account created. You are signed in.");
    } else {
      setAuthMessage("Account created. Check your email to confirm your account before signing in.");
    }
    setAuthScreen("signin");
  };

  const handleForgotPassword = async () => {
    setAuthMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) { setAuthMessage("Enter your email address first."); return; }
    setAuthSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: getAuthRedirectUrl("/reset-password"),
    });
    setAuthSubmitting(false);
    if (error) { setAuthMessage(error.message); return; }
    setEmail(normalizedEmail);
    setAuthScreen("forgot-sent");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null); setQuizQuestions([]); setCurrentIndex(0);
    setSelectedOriginalAnswer(null); setSelectedDisplayAnswer(null);
    setScore(0); setWrong(0); setAnswered(false);
    setPassword(""); setAuthMessage(""); setAuthScreen("signin");
  };

  const switchAuthScreen = (screen: AuthScreen) => {
    setAuthScreen(screen);
    setAuthMessage("");
    setPassword("");
  };

  if (authLoading || progressLoading) return <Spinner message="Loading your session…" />;

  // ── Auth screens ─────────────────────────────────────────────────────────
 if (!user) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050814] px-4 py-10 text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_55%,rgba(37,99,235,0.25),transparent_34%),radial-gradient(circle_at_90%_18%,rgba(59,130,246,0.30),transparent_28%),radial-gradient(circle_at_92%_52%,rgba(147,51,234,0.25),transparent_24%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.15),rgba(2,6,23,0.96))]" />
        <div className="absolute -bottom-24 left-10 h-72 w-[520px] rotate-[-8deg] rounded-full border border-blue-500/20" />
        <div className="absolute -bottom-10 left-20 h-64 w-[640px] rotate-[-10deg] rounded-full border border-violet-500/20" />
        <div className="absolute left-0 top-1/2 h-px w-full bg-gradient-to-r from-transparent via-blue-500/10 to-transparent" />
      </div>

      <main className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-center gap-8">
        <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="relative overflow-hidden rounded-[2rem] border border-blue-400/20 bg-[#071022]/80 p-7 shadow-2xl shadow-blue-950/50 backdrop-blur-2xl sm:p-10">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/70 to-transparent" />
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-600/20 blur-3xl" />

            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-3xl shadow-lg shadow-blue-500/30">
                🚗
              </div>

              <div>
                <p className="text-xl font-bold tracking-tight text-white">
                  Tennessee Permit Practice
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Learner&apos;s permit preparation
                </p>
              </div>
            </div>

            {authScreen === "forgot-sent" ? (
              <div className="mt-10">
                <h1 className="text-4xl font-bold tracking-tight text-white">
                  Check your inbox
                </h1>

                <p className="mt-4 max-w-md text-lg leading-8 text-slate-400">
                  We sent a password reset link to{" "}
                  <span className="font-semibold text-white">{email}</span>.
                  Open the email and follow the link to choose a new password.
                </p>

                <button
                  onClick={() => switchAuthScreen("signin")}
                  className="mt-8 w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-110 active:scale-[0.98]"
                >
                  Back to Sign In
                </button>

                <button
                  onClick={handleForgotPassword}
                  disabled={authSubmitting}
                  className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 py-4 text-base font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
                >
                  {authSubmitting ? "Sending..." : "Resend Email"}
                </button>
              </div>
            ) : authScreen === "forgot" ? (
              <div className="mt-10">
                <h1 className="text-4xl font-bold tracking-tight text-white">
                  Reset password
                </h1>

                <p className="mt-4 max-w-md text-lg leading-8 text-slate-400">
                  Enter your email address and we will send you a secure reset
                  link.
                </p>

                <div className="mt-8">
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Email address
                  </label>

                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleForgotPassword();
                      }
                    }}
                    className="w-full rounded-xl border border-white/10 bg-[#070d1d] px-4 py-4 text-base text-white placeholder-slate-500 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {authMessage && (
                  <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                    {authMessage}
                  </div>
                )}

                <button
                  onClick={handleForgotPassword}
                  disabled={authSubmitting}
                  className="mt-8 w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700 disabled:shadow-none active:scale-[0.98]"
                >
                  {authSubmitting ? "Sending..." : "Send Reset Link →"}
                </button>

                <button
                  onClick={() => switchAuthScreen("signin")}
                  className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 py-4 text-base font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white active:scale-[0.98]"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <>
                <div className="mt-10">
                  <h1 className="text-5xl font-bold tracking-tight text-white">
                    {authScreen === "signin" ? "Welcome back" : "Create account"}
                  </h1>

                  <p className="mt-4 max-w-lg text-xl leading-8 text-slate-400">
                    {authScreen === "signin"
                      ? "Sign in to continue your learner's permit practice and save your progress."
                      : "Create your account and start practicing with saved progress."}
                  </p>
                </div>

                <div className="mt-8 grid grid-cols-2 rounded-xl border border-white/10 bg-[#060b19] p-1">
                  <button
                    onClick={() => switchAuthScreen("signin")}
                    className={`rounded-lg py-3 text-base font-semibold transition ${
                      authScreen === "signin"
                        ? "border border-blue-400/60 bg-blue-500/10 text-white shadow-lg shadow-blue-500/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Sign in
                  </button>

                  <button
                    onClick={() => switchAuthScreen("signup")}
                    className={`rounded-lg py-3 text-base font-semibold transition ${
                      authScreen === "signup"
                        ? "border border-blue-400/60 bg-blue-500/10 text-white shadow-lg shadow-blue-500/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Create account
                  </button>
                </div>

                <div className="mt-8 space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Email address
                    </label>

                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#070d1d] px-4 py-4 transition focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/20">
                      <span className="text-xl text-slate-500">✉</span>
                      <input
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="w-full bg-transparent text-base text-white placeholder-slate-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Password
                    </label>

                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#070d1d] px-4 py-4 transition focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/20">
                      <span className="text-xl text-slate-500">🔒</span>
                      <input
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") return;

                          if (authScreen === "signin") {
                            handleSignIn();
                          } else {
                            handleSignUp();
                          }
                        }}
                        className="w-full bg-transparent text-base text-white placeholder-slate-500 outline-none"
                      />
                    </div>

                    {authScreen === "signin" && (
                      <div className="mt-3 text-right">
                        <button
                          onClick={() => switchAuthScreen("forgot")}
                          className="text-sm font-medium text-blue-400 transition hover:text-blue-300"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {authMessage && (
                  <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                    {authMessage}
                  </div>
                )}

                <button
                  onClick={authScreen === "signin" ? handleSignIn : handleSignUp}
                  disabled={authSubmitting}
                  className="mt-8 w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-4 text-lg font-bold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-110 hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700 disabled:shadow-none active:scale-[0.98]"
                >
                  {authSubmitting
                    ? "Please wait..."
                    : authScreen === "signin"
                      ? "Sign In →"
                      : "Create Account →"}
                </button>

                <div className="my-7 flex items-center gap-4">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-sm font-medium text-slate-500">OR</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <button
                  onClick={() =>
                    switchAuthScreen(
                      authScreen === "signin" ? "signup" : "signin"
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#070d1d] py-4 text-base font-medium text-slate-300 transition hover:bg-white/10 hover:text-white active:scale-[0.98]"
                >
                  {authScreen === "signin" ? (
                    <>
                      Need an account?{" "}
                      <span className="font-semibold text-blue-400">
                        Create one
                      </span>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <span className="font-semibold text-blue-400">
                        Sign in
                      </span>
                    </>
                  )}
                </button>
              </>
            )}
          </section>

          <aside className="relative overflow-hidden rounded-[2rem] border border-blue-400/20 bg-[#071022]/70 p-8 shadow-2xl shadow-blue-950/40 backdrop-blur-2xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
            <div className="absolute -right-16 -bottom-16 h-52 w-52 rounded-full bg-violet-600/20 blur-3xl" />

            <h2 className="text-2xl font-bold tracking-tight text-white">
              Why practice with us?
            </h2>

            <div className="mt-8 space-y-7">
              <div className="flex gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-3xl text-blue-300">
                  📈
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">
                    Track your progress
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    See your scores improve over time and stay motivated.
                  </p>
                </div>
              </div>

              <div className="h-px bg-white/10" />

              <div className="flex gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-3xl text-violet-300">
                  📋
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">
                    Practice real permit questions
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Study the same type of questions you will see on the real
                    test.
                  </p>
                </div>
              </div>

              <div className="h-px bg-white/10" />

              <div className="flex gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-fuchsia-500/10 text-3xl text-fuchsia-300">
                  🕒
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">
                    Pick up where you left off
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    We save your progress so you can keep learning anytime.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Tennessee
                </span>
                <span className="text-xl">★</span>
              </div>

              <div className="mt-5 h-20 rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(59,130,246,0.12),rgba(147,51,234,0.10))]" />

              <p className="mt-4 text-sm leading-6 text-slate-400">
                Built for Tennessee students. Your success is our mission.
              </p>
            </div>
          </aside>
        </div>

        <footer className="mt-8 flex items-center justify-center gap-3 text-sm text-slate-500">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-400/30 bg-blue-500/10 text-blue-300">
            ✓
          </span>
          <span>Built for Tennessee students. Your success is our mission.</span>
        </footer>
      </main>
    </div>
  );
}

  if (quizQuestions.length === 0) return <Spinner message="Building your quiz…" />;

  const currentQuestion = quizQuestions[currentIndex];
  const totalQuestions = quizQuestions.length;
  const answeredCount = answered ? currentIndex + 1 : currentIndex;
  const progressPercent = ((currentIndex + 1) / totalQuestions) * 100;
  const scorePercent =
    answeredCount === 0 ? 0 : Math.round((score / answeredCount) * 100);
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const isFinished = isLastQuestion && answered;

  const correctChoice = currentQuestion.shuffledChoices.find(
    (c) => c.originalKey === currentQuestion.answer
  );
  const correctDisplayChoice = correctChoice?.label ?? currentQuestion.answer;
  const correctDisplayText =
    correctChoice?.text ?? currentQuestion.choices[currentQuestion.answer];
  const questionTones = [
    {
      glow: "bg-cyan-500/20",
      line: "via-cyan-300/70",
      chip: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
      progress: "from-cyan-300 via-blue-400 to-violet-400",
      choiceHover: "hover:border-cyan-300/50 hover:bg-cyan-400/10",
      letterHover:
        "group-hover:from-cyan-400 group-hover:to-blue-500 group-hover:text-white",
      sectionText: "text-cyan-200",
    },
    {
      glow: "bg-amber-500/20",
      line: "via-amber-300/70",
      chip: "border-amber-300/30 bg-amber-400/10 text-amber-100",
      progress: "from-amber-300 via-orange-400 to-rose-400",
      choiceHover: "hover:border-amber-300/50 hover:bg-amber-400/10",
      letterHover:
        "group-hover:from-amber-300 group-hover:to-orange-500 group-hover:text-slate-950",
      sectionText: "text-amber-200",
    },
    {
      glow: "bg-emerald-500/20",
      line: "via-emerald-300/70",
      chip: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
      progress: "from-emerald-300 via-teal-400 to-sky-400",
      choiceHover: "hover:border-emerald-300/50 hover:bg-emerald-400/10",
      letterHover:
        "group-hover:from-emerald-300 group-hover:to-teal-500 group-hover:text-slate-950",
      sectionText: "text-emerald-200",
    },
  ];
  const questionTone = questionTones[currentQuestion.id % questionTones.length];

  const handleAnswer = async (displayChoice: Choice, originalChoice: Choice) => {
    if (answered) return;
    const isCorrect = originalChoice === currentQuestion.answer;
    const nextScore = isCorrect ? score + 1 : score;
    const nextWrong = isCorrect ? wrong : wrong + 1;
    setSelectedDisplayAnswer(displayChoice);
    setSelectedOriginalAnswer(originalChoice);
    setAnswered(true);
    setScore(nextScore);
    setWrong(nextWrong);
    await saveProgress({
      currentIndex, score: nextScore, wrong: nextWrong, answered: true,
      selectedOriginalAnswer: originalChoice, selectedDisplayAnswer: displayChoice,
    });
  };

  const handleNext = async () => {
    if (!answered) return;
    const nextIndex = isLastQuestion ? currentIndex : currentIndex + 1;
    setSelectedOriginalAnswer(null); setSelectedDisplayAnswer(null); setAnswered(false);
    if (!isLastQuestion) setCurrentIndex(nextIndex);
    await saveProgress({
      currentIndex: nextIndex, score, wrong, answered: false,
      selectedOriginalAnswer: null, selectedDisplayAnswer: null,
    });
  };

  const handleRestart = async () => {
    const freshQuiz = buildQuizQuestions();
    setQuizQuestions(freshQuiz); setCurrentIndex(0);
    setSelectedOriginalAnswer(null); setSelectedDisplayAnswer(null);
    setScore(0); setWrong(0); setAnswered(false);
    await saveProgress({
      quizQuestions: freshQuiz, currentIndex: 0, score: 0, wrong: 0, answered: false,
      selectedOriginalAnswer: null, selectedDisplayAnswer: null,
    });
  };

  // ── Results screen ───────────────────────────────────────────────────────
  if (isFinished) {
    const tier =
      scorePercent >= 80
        ? { emoji: "🏆", label: "You're ready to pass!", gradient: "from-emerald-400 to-cyan-400", shadow: "shadow-emerald-500/30" }
        : scorePercent >= 60
        ? { emoji: "📚", label: "Good progress — keep studying!", gradient: "from-amber-400 to-orange-400", shadow: "shadow-amber-500/30" }
        : { emoji: "💪", label: "Keep practicing — you've got this!", gradient: "from-rose-400 to-pink-400", shadow: "shadow-rose-500/30" };

    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[#060812] px-4 py-12">
        <BgOrbs />
        <div className="relative w-full max-w-lg">
          <div className="mb-8 flex justify-center">
            <div className={`flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br text-5xl shadow-2xl ${tier.gradient} ${tier.shadow}`}>
              {tier.emoji}
            </div>
          </div>
          <h1 className="text-center text-4xl font-bold tracking-tight text-white">
            Practice Complete
          </h1>
          <p className={`mt-2 text-center text-sm font-semibold bg-gradient-to-r bg-clip-text text-transparent ${tier.gradient}`}>
            {tier.label}
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            <StatPill label="Correct" value={score} gradient="from-emerald-400 to-cyan-400" />
            <StatPill label="Wrong" value={wrong} gradient="from-rose-400 to-pink-400" />
            <StatPill label="Score" value={`${scorePercent}%`} gradient="from-blue-400 to-violet-400" />
          </div>
          <div className="relative mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-400">{score} of {totalQuestions} correct</span>
              <span className={`font-bold bg-gradient-to-r bg-clip-text text-transparent ${tier.gradient}`}>
                {scorePercent}%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full bg-gradient-to-r transition-all duration-1000 ${tier.gradient}`}
                style={{ width: `${scorePercent}%` }}
              />
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleRestart}
              className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:brightness-110 active:scale-[0.98]"
            >
              ↺ Try Again
            </button>
            <button
              onClick={handleSignOut}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white active:scale-[0.98]"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz screen ──────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen bg-[#060812] px-4 py-8 text-white">
      <BgOrbs />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-48 bg-[linear-gradient(90deg,rgba(34,211,238,0.12),rgba(251,191,36,0.10),rgba(52,211,153,0.12))]" />
      <div className="relative mx-auto max-w-6xl">

        {/* Header */}
        <header className="relative mb-6 flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/10 bg-[#08101f]/80 p-5 shadow-xl shadow-slate-950/50 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${questionTone.line} to-transparent`} />
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 text-base shadow-md shadow-blue-500/30">
                🚗
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                Tennessee Permit Practice
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-600">
              {user.email} · auto-saving
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatPill label="Correct" value={score} gradient="from-emerald-400 to-cyan-400" />
            <StatPill label="Wrong" value={wrong} gradient="from-rose-400 to-pink-400" />
            <StatPill
              label="Score"
              value={answeredCount === 0 ? "—" : `${scorePercent}%`}
              gradient="from-blue-400 to-violet-400"
            />
            <button
              onClick={handleSignOut}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Body grid */}
        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">

          {/* Question card */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#09111f]/90 p-6 shadow-2xl shadow-slate-950/60 backdrop-blur-xl sm:p-8">
            <div className={`absolute -right-24 -top-24 h-64 w-64 rounded-full ${questionTone.glow} blur-3xl`} />
            <div className="absolute -bottom-32 left-12 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent ${questionTone.progress} to-transparent`} />

            {/* Progress */}
            <div className="relative mb-4 flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-[0.16em] text-slate-500">
                Question <span className="font-bold text-white">{currentIndex + 1}</span> of {totalQuestions}
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${questionTone.chip}`}>
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-white/10 shadow-inner shadow-black/40">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${questionTone.progress} transition-all duration-700`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Chapter / topic */}
            <div className="relative mt-6 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${questionTone.chip}`}>
                {currentQuestion.chapter}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                {currentQuestion.topic}
              </span>
              <span className={`rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold ${questionTone.sectionText}`}>
                {currentQuestion.section}
              </span>
            </div>

            {/* Question */}
            <h2 className="relative mt-5 max-w-3xl text-2xl font-black leading-tight text-white sm:text-3xl">
              {currentQuestion.question}
            </h2>

            {/* Choices */}
            <div className="relative mt-7 grid gap-3">
              {currentQuestion.shuffledChoices.map((choice) => {
                const isCorrect = choice.originalKey === currentQuestion.answer;
                const isSelected = selectedDisplayAnswer === choice.label;

                let wrapClass =
                  "group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border px-5 py-4 text-left text-base font-semibold transition-all duration-200 ";
                if (!answered) {
                  wrapClass += `border-white/10 bg-white/[0.06] shadow-lg shadow-black/10 ${questionTone.choiceHover} cursor-pointer active:scale-[0.99]`;
                } else if (isCorrect) {
                  wrapClass += "border-emerald-300/50 bg-emerald-400/15 text-emerald-100 shadow-lg shadow-emerald-950/30";
                } else if (isSelected && !isCorrect) {
                  wrapClass += "border-rose-300/50 bg-rose-400/15 text-rose-100 shadow-lg shadow-rose-950/30";
                } else {
                  wrapClass += "border-white/5 bg-white/[0.025] text-slate-500 cursor-default";
                }

                let letterClass =
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black transition-all duration-200 ";
                if (!answered) {
                  letterClass += `bg-white/10 text-slate-300 group-hover:bg-gradient-to-br ${questionTone.letterHover}`;
                } else if (isCorrect) {
                  letterClass += "bg-gradient-to-br from-emerald-300 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25";
                } else if (isSelected && !isCorrect) {
                  letterClass += "bg-gradient-to-br from-rose-300 to-pink-500 text-slate-950";
                } else {
                  letterClass += "bg-white/5 text-slate-700";
                }

                return (
                  <button
                    key={`${currentQuestion.id}-${choice.label}`}
                    onClick={() => handleAnswer(choice.label, choice.originalKey)}
                    disabled={answered}
                    className={wrapClass}
                  >
                    {!answered && (
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                    )}
                    <span className={letterClass}>{choice.label}</span>
                    <span className="relative flex-1 leading-6">{choice.text}</span>
                    {answered && isCorrect && <span className="ml-auto text-lg text-emerald-400">✓</span>}
                    {answered && isSelected && !isCorrect && <span className="ml-auto text-lg text-rose-400">✗</span>}
                  </button>
                );
              })}
            </div>

            {/* Feedback */}
            {answered && (
              <div
                className={`relative mt-5 flex items-start gap-3 rounded-2xl border px-5 py-4 text-sm font-semibold shadow-lg ${
                  selectedOriginalAnswer === currentQuestion.answer
                    ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-100 shadow-emerald-950/20"
                    : "border-rose-300/30 bg-rose-400/15 text-rose-100 shadow-rose-950/20"
                }`}
              >
                <span className="mt-0.5 text-lg">
                  {selectedOriginalAnswer === currentQuestion.answer ? "✅" : "❌"}
                </span>
                {selectedOriginalAnswer === currentQuestion.answer ? (
                  <span>Correct! Great work.</span>
                ) : (
                  <span>
                    Incorrect. The answer is{" "}
                    <strong className="font-bold text-white">
                      {correctDisplayChoice}. {correctDisplayText}
                    </strong>
                  </span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="relative mt-7 flex items-center justify-between">
              <button
                onClick={handleRestart}
                className="rounded-xl border border-white/10 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-[0.97]"
              >
                ↺ Restart
              </button>
              <button
                onClick={handleNext}
                disabled={!answered}
                className={`rounded-xl bg-gradient-to-r ${questionTone.progress} px-8 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-black/25 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:from-slate-700 disabled:via-slate-700 disabled:to-slate-700 disabled:text-slate-400 disabled:shadow-none active:scale-[0.97]`}
              >
                {isLastQuestion ? "See Result →" : "Next →"}
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-3">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#101827]/80 p-5 shadow-lg shadow-black/20 backdrop-blur-xl">
              <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${questionTone.line} to-transparent`} />
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Answered</p>
              <p className="mt-1 text-3xl font-bold text-white">{answeredCount}</p>
              <p className="text-xs text-slate-400">of {totalQuestions}</p>
              <MiniBar
                percent={Math.round((answeredCount / totalQuestions) * 100)}
                gradient={questionTone.progress}
              />
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-5 shadow-lg shadow-emerald-950/20 backdrop-blur-xl">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-200/80">Correct</p>
              <p className="mt-1 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-3xl font-bold text-transparent">
                {score}
              </p>
              <MiniBar
                percent={answeredCount === 0 ? 0 : Math.round((score / answeredCount) * 100)}
                gradient="from-emerald-500 to-cyan-500"
              />
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-rose-300/20 bg-rose-400/10 p-5 shadow-lg shadow-rose-950/20 backdrop-blur-xl">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/40 to-transparent" />
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-rose-200/80">Wrong</p>
              <p className="mt-1 bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-3xl font-bold text-transparent">
                {wrong}
              </p>
              <MiniBar
                percent={answeredCount === 0 ? 0 : Math.round((wrong / answeredCount) * 100)}
                gradient="from-rose-500 to-pink-500"
              />
            </div>

            <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${questionTone.progress} p-5 shadow-2xl shadow-black/30`}>
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/25 blur-xl" />
              <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-white/20 blur-lg" />
              <p className="relative text-[10px] font-black uppercase tracking-[0.15em] text-slate-950/70">Accuracy</p>
              <p className="relative mt-1 text-4xl font-black text-white">
                {answeredCount === 0 ? "—" : `${scorePercent}%`}
              </p>
              {answeredCount > 0 && (
                <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-700"
                    style={{ width: `${scorePercent}%` }}
                  />
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
