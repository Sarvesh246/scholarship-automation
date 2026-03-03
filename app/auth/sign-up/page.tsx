"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Divider } from "@/components/ui/Divider";
import { GoogleLogo } from "@/components/ui/GoogleLogo";
import { signInWithGoogle, signUpWithEmail, updateUserDisplayName } from "@/lib/auth";
import { setAuthCookie } from "@/lib/cookie";
import { useToast } from "@/components/ui/Toast";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
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

  const handleEmailSignUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      showToast({
        title: "Terms required",
        message: "Please accept the Terms and Privacy Policy to continue.",
        variant: "danger"
      });
      return;
    }
    if (password.length < 8) {
      showToast({
        title: "Password too short",
        message: "Password must be at least 8 characters.",
        variant: "danger"
      });
      return;
    }
    setLoading(true);
    try {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        showToast({ title: "Email is required", variant: "danger" });
        setLoading(false);
        return;
      }
      await signUpWithEmail(trimmedEmail, password);
      if (name.trim()) {
        await updateUserDisplayName(name.trim());
      }
      setAuthCookie();
      router.replace(redirectTo);
      showToast({
        title: "Account created",
        message: "Welcome to your scholarship workspace.",
        variant: "success"
      });
    } catch (err: unknown) {
      const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : "";
      if (code === "auth/email-already-in-use") {
        showToast({
          title: "Email already in use",
          message: "Sign in instead or use a different email.",
          variant: "danger"
        });
      } else {
        showToast({
          title: "Sign-up failed",
          message: "Please check your details and try again.",
          variant: "danger"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGooglePopupBlocked(false);
    setLoading(true);
    try {
      await signInWithGoogle();
      setAuthCookie();
      router.replace(redirectTo);
      showToast({
        title: "Signed up with Google",
        variant: "success"
      });
    } catch (err: unknown) {
      const obj = err && typeof err === "object" ? (err as Record<string, unknown>) : {};
      const errObj = obj.error && typeof obj.error === "object" ? (obj.error as Record<string, unknown>) : null;
      const code = (obj.code ?? errObj?.code ?? "") as string;
      if (code === "auth/popup-blocked") {
        setGooglePopupBlocked(true);
        showToast({
          title: "Popup blocked",
          message: "Allow popups for this site, then click Try again below.",
          variant: "danger"
        });
      } else {
        setGooglePopupBlocked(false);
        showToast({
          title: "Google sign-up failed",
          message: "Please try again.",
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
        <h1 className="text-lg font-semibold font-heading">Create your workspace</h1>
        <p className="text-xs text-[var(--muted)]">
          Set up a calm place to manage scholarships.
        </p>
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full justify-center"
        onClick={() => { setGooglePopupBlocked(false); handleGoogleSignUp(); }}
        disabled={loading}
        leftIcon={<GoogleLogo className="h-5 w-5" />}
      >
        Sign up with Google
      </Button>
      {googlePopupBlocked && (
        <p className="text-xs text-amber-400">
          Popup was blocked. Allow popups for this site, then{" "}
          <button type="button" onClick={() => handleGoogleSignUp()} className="underline font-medium hover:no-underline">
            try again
          </button>
          .
        </p>
      )}

      <Divider label="or continue with email" />

      <form onSubmit={handleEmailSignUp} className="space-y-4">
        <Input
          name="name"
          label="Full name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          type="email"
          name="email"
          label="Email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div>
          <Input
            type="password"
            name="password"
            label="Password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="mt-1 text-[10px] text-[var(--muted-2)]">At least 8 characters.</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[var(--muted-2)]">
          <input
            id="terms"
            type="checkbox"
            required
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="h-3 w-3 rounded border-[var(--border)]"
          />
          <label htmlFor="terms">
            I agree to the ApplyPilot Terms and Privacy Policy.
          </label>
        </div>
        <Button
          type="submit"
          className="mt-2 w-full justify-center"
          disabled={loading}
        >
          Create account
        </Button>
      </form>

      <p className="pt-2 text-xs text-[var(--muted)]">
        Already have an account?{" "}
        <Link
          href={redirectTo !== "/app/dashboard" ? `/auth/sign-in?from=${encodeURIComponent(redirectTo)}` : "/auth/sign-in"}
          className="font-medium text-[var(--text)] underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}

