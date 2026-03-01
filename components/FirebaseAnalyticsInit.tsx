"use client";

import { useEffect } from "react";
import { getAnalyticsSafe } from "@/lib/firebase";

/**
 * Call getAnalyticsSafe() once on client mount so Firebase Analytics
 * is initialized when the app runs in the browser. SSR-safe.
 */
export function FirebaseAnalyticsInit() {
  useEffect(() => {
    getAnalyticsSafe();
  }, []);
  return null;
}
