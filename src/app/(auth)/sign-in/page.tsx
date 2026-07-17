"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useState, useEffect } from "react";
import { signIn, getProviders, getCsrfToken } from "next-auth/react";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { features } from "@/config/features";
import { brand } from "@/config/brand";

// Local (passwordless credentials) login: dev mode, or sovereign/self-hosted
// builds with NEXT_PUBLIC_LOCAL_AUTH_ENABLED=true. The NextAuth provider id
// stays "dev-credentials" — auth flows reference it — even though the UI now
// presents it as the plain local sign-in.
const isDev = features.devAuthEnabled;

export default function SignInPage() {
  const t = useTranslations("signIn");
  const [email, setEmail] = useState("");
  const [devEmail, setDevEmail] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [passphraseRequired, setPassphraseRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isDevLoading, setIsDevLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string>();
  const [providers, setProviders] = useState<Record<string, { id: string; name: string }> | null>(null);

  useEffect(() => {
    getProviders().then((p) => setProviders(p));
    getCsrfToken().then((token) => setCsrfToken(token ?? undefined));
    // Runtime (never baked) flag: does the local sign-in need the workspace
    // passphrase? Failure to fetch degrades to "not required" — the server
    // still enforces it either way.
    fetch("/api/self-host/auth-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPassphraseRequired(!!d?.passphraseRequired))
      .catch(() => {});
  }, []);

  const hasEmail = !!providers?.email;
  const hasGoogle = !!providers?.google;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("email", {
        email,
        redirect: false,
        callbackUrl: "/governance",
      });

      if (result?.error) {
        setError("Failed to send magic link. Please try again.");
      } else {
        setIsEmailSent(true);
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleFormSubmit = () => {
    setIsGoogleLoading(true);
    setError(null);
  };

  const handleDevSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDevLoading(true);
    setError(null);

    try {
      const result = await signIn("dev-credentials", {
        email: devEmail,
        passphrase,
        redirect: false,
        callbackUrl: "/governance",
      });
      if (result?.error) {
        // CredentialsSignin is the only failure the provider produces; when a
        // passphrase is required, a wrong/missing one is by far the likeliest cause.
        setError(passphraseRequired ? t("wrongPassphrase") : t("localSignInFailed"));
        setIsDevLoading(false);
      } else {
        window.location.href = result?.url ?? "/governance";
      }
    } catch {
      setError(t("localSignInFailed"));
      setIsDevLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="w-full max-w-md">
        <div className="card-brutal text-center">
          <div className="w-16 h-16 bg-primary/20 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Check Your Email</h1>
          <p className="text-muted-foreground mb-6">
            We&apos;ve sent a magic link to <span className="text-foreground font-medium">{email}</span>.
            Click the link in the email to sign in.
          </p>
          <p className="text-sm text-muted-foreground">
            Didn&apos;t receive it?{" "}
            <button onClick={() => setIsEmailSent(false)} className="text-primary hover:underline">
              Try again
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="card-brutal">
        <div className="text-center mb-8">
          <h1 className="text-3xl mb-4 text-white uppercase tracking-wide" style={{ fontFamily: "var(--font-jost), 'Jost', sans-serif", fontWeight: 600 }}>AI SENTINEL</h1>
          <p className="text-muted-foreground text-sm">Cross-border AI Governance</p>
        </div>

        {isDev && (
          <div className="mb-6 p-4 border border-border bg-secondary/30">
            <p className="text-sm font-semibold mb-1">{t("localTitle")}</p>
            <p className="text-xs text-muted-foreground mb-3">{t("localBody")}</p>
            <form onSubmit={handleDevSignIn} className="space-y-3">
              <Input
                type="email"
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                className="input-brutal"
                required
              />
              {passphraseRequired && (
                <div className="space-y-1">
                  <Label htmlFor="workspace-passphrase" className="text-xs">
                    {t("passphraseLabel")}
                  </Label>
                  <Input
                    id="workspace-passphrase"
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="input-brutal"
                    autoComplete="current-password"
                    required
                  />
                  <p className="text-xs text-muted-foreground">{t("passphraseHelp")}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={isDevLoading}
                className="btn-brutal w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDevLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("signingIn")}
                  </>
                ) : (
                  t("signInButton")
                )}
              </button>
            </form>
          </div>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive text-destructive text-sm mb-6">
            {error}
          </div>
        )}

        {hasEmail && (
          <>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="input-brutal"
                  required
                  autoFocus={!isDev}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !email}
                className="btn-brutal w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Continue with Email
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              No password needed. We&apos;ll send you a secure link.
            </p>
          </>
        )}

        {hasGoogle && (
          <div className={hasEmail ? "mt-6 pt-6 border-t border-border" : ""}>
            {hasEmail && <p className="text-xs text-muted-foreground text-center mb-4">Or continue with</p>}
            {/* Native form POST avoids Safari ITP blocking fetch-based OAuth redirects */}
            <form method="post" action="/api/auth/signin/google" onSubmit={handleGoogleFormSubmit}>
              <input type="hidden" name="csrfToken" value={csrfToken ?? ""} />
              <input type="hidden" name="callbackUrl" value="/governance" />
              <button
                type="submit"
                disabled={isGoogleLoading || !csrfToken}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-full border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                <span className="font-medium">
                  {isGoogleLoading ? "Signing in..." : "Continue with Google"}
                </span>
              </button>
            </form>
          </div>
        )}

        {/* Only claim "no providers" when the local login is ALSO absent —
            on self-host the local form above is a fully working provider. */}
        {!hasEmail && !hasGoogle && !isDev && providers !== null && (
          <div className="p-4 bg-destructive/10 border border-destructive text-destructive text-sm">
            No sign-in providers configured. Please contact the administrator.
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
            <a href={brand.termsOfUseUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href={brand.privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
