"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Divider } from "@/components/ui/Divider";
import { GoogleLogo } from "@/components/ui/GoogleLogo";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth";
import { setAuthCookie } from "@/lib/cookie";
import { useToast } from "@/components/ui/Toast";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googlePopupBlocked, setGooglePopupBlocked] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const redirectTo = (() => {
    const from = searchParams?.get("from");
    if (typeof from === "string" && from.startsWith("/app") && !from.startsWith("//")) return from;
    return "/app/dashboard";
  })();

  const handleEmailSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      setAuthCookie();
      router.replace(redirectTo);
      showToast({ title: "Welcome back", variant: "success" });
    } catch (err: unknown) {
      const obj = err && typeof err === "object" ? (err as Record<string, unknown>) : {};
      const code = (obj.code ?? (obj as { code?: string }).code) as string;
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        showToast({ title: "Incorrect email or password.", variant: "danger" });
      } else {
        showToast({
          title: "Sign-in failed",
          message: "Check your credentials and try again.",
          variant: "danger"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGooglePopupBlocked(false);
    setLoading(true);
    try {
      await signInWithGoogle();
      setAuthCookie();
      router.replace(redirectTo);
      showToast({ title: "Signed in with Google", variant: "success" });
    } catch (err: unknown) {
      // Firebase Auth errors: { code: "auth/...", message: "..." }; sometimes wrapped
      const obj = err && typeof err === "object" ? (err as Record<string, unknown>) : {};
      const errObj = obj.error && typeof obj.error === "object" ? (obj.error as Record<string, unknown>) : null;
      const code = (obj.code ?? errObj?.code ?? "") as string;
      const msg = (obj.message ?? errObj?.message ?? "") as string;
      const detail = code ? `${code}${msg ? `: ${msg}` : ""}` : msg || (err instanceof Error ? err.message : String(err));
      if (typeof window !== "undefined") {
        console.error("[Google sign-in]", detail, err);
      }
      if (code === "auth/unauthorized-domain") {
        showToast({
          title: "Google sign-in failed",
          message: "This domain is not authorized. Add scholarship-automation.vercel.app in Firebase → Auth → Authorized domains.",
          variant: "danger"
        });
      } else if (code === "auth/popup-blocked") {
        setGooglePopupBlocked(true);
        showToast({
          title: "Popup blocked",
          message: "Allow popups for this site, then click Try again below.",
          variant: "danger"
        });
      } else {
        setGooglePopupBlocked(false);
        showToast({
          title: "Google sign-in failed",
          message: detail || "Please try again.",
          variant: "danger"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold font-heading">Welcome back</h1>
        <p className="text-xs text-[var(--muted)]">
          Sign in to your calm scholarship workspace.
        </p>
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full justify-center"
        onClick={() => { setGooglePopupBlocked(false); handleGoogleSignIn(); }}
        disabled={loading}
        leftIcon={<GoogleLogo className="h-5 w-5" />}
      >
        Continue with Google
      </Button>
      {googlePopupBlocked && (
        <p className="text-xs text-amber-400">
          Popup was blocked. Allow popups for this site, then{" "}
          <button type="button" onClick={() => handleGoogleSignIn()} className="underline font-medium hover:no-underline">
            try again
          </button>.
        </p>
      )}

      <Divider label="or continue with email" />

      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <Input
          type="email"
          name="email"
          label="Email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          name="password"
          label="Password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex items-center justify-between text-xs">
          <Link
            href="/auth/forgot-password"
            className="text-[var(--muted)] hover:text-[var(--text)]"
          >
            Forgot password?
          </Link>
        </div>
        <Button
          type="submit"
          className="mt-2 w-full justify-center"
          disabled={loading}
        >
          Sign in
        </Button>
      </form>

      <p className="pt-2 text-xs text-[var(--muted)]">
        New here?{" "}
        <Link
          href={redirectTo !== "/app/dashboard" ? `/auth/sign-up?from=${encodeURIComponent(redirectTo)}` : "/auth/sign-up"}
          className="font-medium text-[var(--text)] underline-offset-2 hover:underline"
        >
          Create an account
        </Link>
        .
      </p>

      <p className="text-[10px] text-[var(--muted-2)]">
        By signing in, you agree to our ApplyPilot Terms and Privacy Policy.
      </p>
    </div>
  );
}

