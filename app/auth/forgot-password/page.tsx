"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { sendPasswordReset } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordReset(email);
      showToast({
        title: "Reset link sent",
        message: "Check your inbox for a password reset email.",
        variant: "success"
      });
    } catch {
      showToast({
        title: "Unable to send reset",
        message: "Please confirm your email and try again.",
        variant: "danger"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold font-heading">Reset your password</h1>
        <p className="text-xs text-[var(--muted)]">
          Enter your email and we&apos;ll send a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          name="email"
          label="Email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button
          type="submit"
          className="w-full justify-center"
          disabled={loading}
        >
          Send reset link
        </Button>
      </form>

      <p className="pt-2 text-xs text-[var(--muted)]">
        Remembered it?{" "}
        <Link
          href="/auth/sign-in"
          className="font-medium text-[var(--text)] underline-offset-2 hover:underline"
        >
          Back to sign in
        </Link>
        .
      </p>
    </div>
  );
}

