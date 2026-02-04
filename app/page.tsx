"use client";

import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [answered, setAnswered] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-pink-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-center justify-center rounded-2xl bg-white px-12 py-20 text-center shadow-xl dark:bg-zinc-900">
        <Image src="/heart.svg" alt="Heart" width={80} height={80} priority />

        <h1 className="mt-8 text-4xl font-semibold tracking-tight text-pink-600 dark:text-pink-400">
          {answered ? "That is the correct answer 💖" : "Will you be my Valentine?"}
        </h1>

        {!answered && (
          <p className="mt-4 max-w-md text-lg text-zinc-600 dark:text-zinc-300">
            I was thinking… life’s already pretty great, but it would be even better with you by my side ❤️
          </p>
        )}

        <div className="mt-10 flex gap-6">
          <button
            className="h-12 rounded-full bg-pink-500 px-8 text-white transition hover:bg-pink-600"
            onClick={() => setAnswered(true)}
          >
            Yes 💕
          </button>

          <button
            className="h-12 cursor-not-allowed rounded-full border border-pink-300 px-8 text-pink-300 opacity-60"
            disabled
          >
            Maybe 😌
          </button>
        </div>

        {answered && (
          <p className="mt-6 text-lg text-pink-500">
            Smart choice 😉
          </p>
        )}

        <p className="mt-10 text-sm text-zinc-400">
          Made with ❤️ just for you
        </p>
      </main>
    </div>
  );
}
