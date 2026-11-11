"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Layers3,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { apiFetch } from "@/lib/api-client";

type Mode = "login" | "register" | "reset" | "verify";
export function LoginScreen({
  heading,
  description,
  mode = "login",
}: {
  heading?: string;
  description?: string;
  mode?: Mode;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptPolicies, setAcceptPolicies] = useState(false);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const value =
      new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
    if (value) {
      window.history.replaceState(null, "", window.location.pathname);
      const frame = requestAnimationFrame(() => setToken(value));
      return () => cancelAnimationFrame(frame);
    }
  }, []);
  const titles = {
    login: "Welcome back.",
    register: "A clearer picture starts here.",
    reset: token ? "Choose a new password." : "Get back to your workspace.",
    verify: "Verify your email.",
  };
  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await apiFetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "verify"
            ? { token }
            : mode === "reset" && token
              ? { token, password }
              : { name, email, password, acceptPolicies },
        ),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Request failed. Please try again.");
      if (mode === "login") {
        router.push("/dashboard");
        router.refresh();
      } else {
        setMessage(data.message || "Done.");
        setPassword("");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to connect.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 md:px-12">
      <header className="flex items-center justify-between">
        <Link
          className="flex items-center gap-2 text-xl font-semibold tracking-tight"
          href="/"
        >
          <Layers3 className="text-emerald-700" />
          complyra.
        </Link>
        <ThemeToggle />
      </header>
      <div className="my-auto grid items-center gap-12 py-16 md:grid-cols-2">
        <section>
          <p className="text-xs font-semibold tracking-[.2em] text-emerald-700">
            A LITTLE MORE FINANCIAL CLARITY
          </p>
          <h1 className="mt-5 text-4xl font-medium leading-tight tracking-tight md:text-5xl">
            {heading || titles[mode]}
          </h1>
          <p className="mt-6 max-w-sm text-sm leading-7 text-ink/60">
            {description ||
              "Your statements, spending insights and financial decisions, together in a private workspace."}
          </p>
          <div className="mt-9 flex gap-3 rounded-2xl border border-emerald-600/15 bg-emerald-500/5 p-5">
            <ShieldCheck className="shrink-0 text-emerald-700" size={22} />
            <p className="text-xs leading-6 text-ink/65">
              Accounts activate after email verification. Your workspace is
              accessible only after you sign in.
            </p>
          </div>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 text-xs text-ink/60"
          >
            <ArrowLeft size={14} /> Back to the website
          </Link>
        </section>
        <form
          onSubmit={onSubmit}
          className="space-y-5 rounded-3xl border border-ink/10 bg-white/90 p-7 shadow-xl shadow-ink/5 md:p-9"
        >
          <div className="mb-6 flex items-center gap-2 text-sm font-semibold">
            <LockKeyhole size={17} />
            {mode === "register"
              ? "Create an account"
              : mode === "verify"
                ? "Confirm your email address"
                : mode === "reset"
                  ? "Password recovery"
                  : "Sign in to Complyra"}
          </div>
          {mode === "register" && (
            <label className="block text-sm">
              Your name
              <input
                autoComplete="name"
                className="mt-2 w-full rounded-xl border border-ink/20 bg-canvas p-3"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                required
              />
            </label>
          )}
          {mode !== "verify" && !(mode === "reset" && token) && (
            <label className="block text-sm">
              Email address
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="mt-2 w-full rounded-xl border border-ink/20 bg-canvas p-3"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={254}
                required
              />
            </label>
          )}
          {(mode === "login" ||
            mode === "register" ||
            (mode === "reset" && token)) && (
            <div className="block text-sm">
              <label htmlFor="auth-password">
                {mode === "reset" ? "New password" : "Password"}
              </label>
              <div className="relative mt-2">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  className="w-full rounded-xl border border-ink/20 bg-canvas p-3 pr-12"
                  minLength={mode === "login" ? 1 : 12}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink/60 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {mode !== "login" && (
                <span className="mt-2 block text-xs text-ink/50">
                  12-128 characters. A unique passphrase works well.
                </span>
              )}
            </div>
          )}
          {mode === "register" && (
            <label className="flex items-start gap-3 text-xs leading-6 text-ink/65">
              <input
                type="checkbox"
                className="mt-1"
                checked={acceptPolicies}
                onChange={(event) => setAcceptPolicies(event.target.checked)}
                required
              />
              <span>
                I am 18 or older, accept the{" "}
                <Link className="underline" href="/legal/terms" target="_blank">
                  Terms
                </Link>{" "}
                and acknowledge the{" "}
                <Link
                  className="underline"
                  href="/legal/privacy"
                  target="_blank"
                >
                  Privacy Notice
                </Link>
                . I am authorized to upload the records I provide.
              </span>
            </label>
          )}
          {mode === "verify" && (
            <p className="flex gap-2 text-sm leading-6 text-ink/65">
              <Mail className="shrink-0" size={20} />
              {token
                ? "Confirm below to activate your account. This does not sign you in automatically."
                : "Open the link in your verification email. If it has expired, submit the registration form again for a new link."}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-600"
            >
              {error}
            </p>
          )}
          {message && (
            <p
              role="status"
              className="rounded-xl bg-emerald-500/10 p-3 text-sm leading-6 text-emerald-700"
            >
              {message}
            </p>
          )}
          {!(mode === "verify" && !token) &&
            !(
              (mode === "verify" || (mode === "reset" && token)) &&
              message
            ) && (
              <button
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 p-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy
                  ? "Please wait..."
                  : mode === "register"
                    ? "Send verification email"
                    : mode === "verify"
                      ? "Verify email & activate account"
                      : mode === "reset"
                        ? token
                          ? "Save new password"
                          : "Send reset email"
                        : "Sign in"}
                <ArrowRight size={16} />
              </button>
            )}
          <div className="flex flex-wrap justify-between gap-3 border-t border-ink/10 pt-5 text-xs">
            <Link
              className="underline"
              href={mode === "login" ? "/auth/register" : "/auth/login"}
            >
              {mode === "login" ? "Create an account" : "Back to sign in"}
            </Link>
            {mode === "login" && (
              <Link className="text-ink/60 underline" href="/auth/reset">
                Forgot password?
              </Link>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
