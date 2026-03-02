"use client";

import { useState, useEffect } from "react";
import { type User } from "firebase/auth";
import { onAuthChanged } from "@/lib/auth";

function getInitials(displayName: string | null, email: string | null): string {
  if (displayName?.trim()) {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const first = parts[0][0];
      const last = parts[parts.length - 1][0];
      if (first && last) return (first + last).toUpperCase();
    }
    if (parts[0]?.[0]) return parts[0][0].toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "U";
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    return onAuthChanged((u) => setUser(u));
  }, []);

  const displayName = user?.displayName || null;
  const email = user?.email || null;
  const photoURL = user?.photoURL || null;
  const initials = getInitials(displayName, email);

  return { user, displayName, email, photoURL, initials };
}
