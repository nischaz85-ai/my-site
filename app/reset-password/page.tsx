"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        setHasSession(true);
      } else {
        setHasSession(false);
        setMessage(
          "This reset link is expired or invalid. Please request a new password reset link."
        );
      }

      setLoading(false);
    };

    checkSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async () => {
    setMessage("");

    if (!password.trim() || !confirmPassword.trim()) {
      setMessage("Enter and confirm your new password.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setMessage("Password updated successfully. You can now sign in.");
  };

  const goToHome = () => {
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060812] px-4 text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-transparent border-t-blue-400" />
          <p className="text-sm text-slate-400">Checking reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#060812] px-4 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute top-1/2 -right-40 h-[500px] w-[500px] rounded-full bg-violet-600/15 blur-[120px]" />
      </div>

      <main className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-3xl shadow-lg shadow-blue-500/30">
            🔐
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Reset Password
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Choose a new password for your account.
          </p>
        </div>

        {!hasSession ? (
          <>
            {message && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                {message}
              </div>
            )}

            <button
              onClick={goToHome}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-110 active:scale-[0.98]"
            >
              Back to Sign In
            </button>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20"
              />

              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleUpdatePassword();
                  }
                }}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {message && (
              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                {message}
              </div>
            )}

            <button
              onClick={handleUpdatePassword}
              disabled={submitting}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700 disabled:shadow-none active:scale-[0.98]"
            >
              {submitting ? "Updating..." : "Update Password"}
            </button>

            <button
              onClick={goToHome}
              className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white active:scale-[0.98]"
            >
              Back to Sign In
            </button>
          </>
        )}
      </main>
    </div>
  );
}