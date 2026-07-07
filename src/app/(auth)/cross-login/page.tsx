"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";

export default function CrossLoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const attempted = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get("token");
  const method = searchParams.get("method");

  useEffect(() => {
    // Clean token from URL immediately
    if (token) {
      window.history.replaceState({}, "", "/cross-login");
    }

    if (!token || !method) {
      router.replace("/sign-in");
      return;
    }

    if (attempted.current) return;
    attempted.current = true;

    signIn("cross-login", { token, method, redirect: false }).then(
      (result) => {
        if (result?.ok) {
          router.replace("/governance");
        } else {
          setError("Authentication failed. Redirecting to sign-in...");
          setTimeout(() => router.replace("/sign-in"), 2000);
        }
      },
      () => {
        setError("Authentication failed. Redirecting to sign-in...");
        setTimeout(() => router.replace("/sign-in"), 2000);
      }
    );
  }, [token, method, router]);

  return (
    <div className="w-full max-w-md">
      <div className="card-brutal text-center">
        <div className="text-center mb-6">
          <h1 className="text-3xl mb-4 text-white uppercase tracking-wide" style={{ fontFamily: "var(--font-jost), 'Jost', sans-serif", fontWeight: 600 }}>
            AI SENTINEL
          </h1>
        </div>

        {error ? (
          <div className="p-4 bg-destructive/10 border border-destructive text-destructive text-sm">
            {error}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Signing you in...</p>
          </div>
        )}
      </div>
    </div>
  );
}
