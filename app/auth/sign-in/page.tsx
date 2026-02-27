"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Divider } from "@/components/ui/Divider";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleEmailSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      document.cookie = "auth=1; path=/";
      router.push("/app/dashboard");
      showToast({ title: "Welcome back", variant: "success" });
    } catch (error) {
      console.error(error);
      showToast({
        title: "Sign-in failed",
        message: "Check your credentials and try again.",
        variant: "danger"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      document.cookie = "auth=1; path=/";
      router.push("/app/dashboard");
      showToast({ title: "Signed in with Google", variant: "success" });
    } catch (error) {
      console.error(error);
      showToast({
        title: "Google sign-in failed",
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
        <h1 className="text-lg font-semibold">Welcome back</h1>
        <p className="text-xs text-[var(--muted)]">
          Sign in to your calm scholarship workspace.
        </p>
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full justify-center"
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        Continue with Google
      </Button>

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
          href="/auth/sign-up"
          className="font-medium text-[var(--text)] underline-offset-2 hover:underline"
        >
          Create an account
        </Link>
        .
      </p>

      <p className="text-[10px] text-[var(--muted-2)]">
        By signing in, you agree to our placeholder Terms and Privacy Policy.
      </p>
    </div>
  );
}

