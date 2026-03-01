"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Divider } from "@/components/ui/Divider";
import { signInWithGoogle, signUpWithEmail } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleEmailSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUpWithEmail(email, password);
      document.cookie = "auth=1; path=/";
      router.push("/app/dashboard");
      showToast({
        title: "Account created",
        message: "Welcome to your scholarship workspace.",
        variant: "success"
      });
    } catch (error) {
      console.error(error);
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
      document.cookie = "auth=1; path=/";
      router.push("/app/dashboard");
      showToast({
        title: "Signed up with Google",
        variant: "success"
      });
    } catch (error) {
      console.error(error);
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
          label="Name"
          autoComplete="name"
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
        <Input
          type="password"
          name="password"
          label="Password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex items-center gap-2 text-[10px] text-[var(--muted-2)]">
          <input id="terms" type="checkbox" className="h-3 w-3 rounded border-[var(--border)]" />
          <label htmlFor="terms">
            I agree to the placeholder Terms and Privacy Policy.
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

