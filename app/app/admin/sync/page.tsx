"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Sync and scrape are merged; redirect to the combined page. */
export default function AdminSyncPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/app/admin/scrape");
  }, [router]);
  return null;
}
