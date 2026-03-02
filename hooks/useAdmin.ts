"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "./useUser";

export function useAdmin() {
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setIsAdmin(data.isAdmin === true);
    } catch {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    check();
  }, [check]);

  return { isAdmin, loading };
}

/** Get Firebase ID token for the current user (for admin API calls). */
export async function getIdToken(): Promise<string | null> {
  const { auth } = await import("@/lib/firebase");
  const user = auth?.currentUser ?? null;
  if (!user) return null;
  return user.getIdToken();
}
