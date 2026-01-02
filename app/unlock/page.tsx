"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function UnlockInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = password.trim();
    if (!value) return;
    document.cookie = `app_auth=${value}; path=/; SameSite=Lax`;
    router.push(redirect);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-panel p-6 shadow-lg space-y-4">
        <h1 className="text-lg font-semibold">Enter Password</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-2xl border border-border bg-transparent px-3 py-2 text-sm outline-none"
          />
          {error ? <div className="text-sm text-red-500">{error}</div> : null}
          <button
            type="submit"
            className="w-full rounded-full border border-border bg-foreground px-3 py-2 text-sm font-semibold text-background"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}

export default function UnlockPage() {
  return (
    <Suspense fallback={null}>
      <UnlockInner />
    </Suspense>
  );
}
