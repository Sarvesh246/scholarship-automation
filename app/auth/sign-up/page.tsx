"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Divider } from "@/components/ui/Divider";
import { signInWithGoogle, signUpWithEmail, updateUserDisplayName } from "@/lib/auth";
import { setAuthCookie } from "@/lib/cookie";
import { useToast } from "@/components/ui/Toast";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

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
      await signUpWithEmail(email, password);
      if (name.trim()) {
        await updateUserDisplayName(name.trim());
      }
      setAuthCookie();
      router.push("/app/dashboard");
      showToast({
        title: "Account created",
        message: "Welcome to your scholarship workspace.",
        variant: "success"
      });
    } catch {
      showToast({
        title: "Sign-up failed",
        message: "Please check your details and try again.",
        variant: "danger"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      setAuthCookie();
      router.push("/app/dashboard");
      showToast({
        title: "Signed up with Google",
        variant: "success"
      });
    } catch {
      showToast({
        title: "Google sign-up failed",
        message: "Please try again.",
        variant: "danger"
      });
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
        onClick={handleGoogleSignUp}
        disabled={loading}
      >
        Sign up with Google
      </Button>

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
          href="/auth/sign-in"
          className="font-medium text-[var(--text)] underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}

