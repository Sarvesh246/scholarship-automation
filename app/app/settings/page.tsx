"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { signOutUser } from "@/lib/auth";
import { clearAuthCookie } from "@/lib/cookie";
import { useUser } from "@/hooks/useUser";
import { getProfile } from "@/lib/profileStorage";
import { getApplications } from "@/lib/applicationStorage";
import { getEssays } from "@/lib/essayStorage";
import { getInitialTheme, setTheme, type Theme } from "@/lib/theme";
import { getIdToken } from "@/hooks/useAdmin";

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [deadlineReminders, setDeadlineReminders] = useState(true);
  const [theme, setThemeState] = useState<Theme>("dark");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();
  const { displayName, email, initials } = useUser();

  useEffect(() => {
    setThemeState(getInitialTheme());
  }, []);

  const handleTheme = (t: Theme) => {
    setTheme(t);
    setThemeState(t);
    showToast({ title: "Theme updated", variant: "success" });
  };

  const handleSave = () => {
    showToast({
      title: "Settings saved",
      message: "Notification preferences saved.",
      variant: "success"
    });
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const [profile, applications, essays] = await Promise.all([
        getProfile(),
        getApplications(),
        getEssays(),
      ]);
      const blob = new Blob(
        [JSON.stringify({ exportedAt: new Date().toISOString(), profile, applications, essays }, null, 2)],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `applypilot-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast({ title: "Export downloaded", variant: "success" });
    } catch {
      showToast({ title: "Export failed", variant: "danger" });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const token = await getIdToken();
      if (!token) {
        showToast({ title: "Please sign in again and try again", variant: "danger" });
        return;
      }
      const res = await fetch("/api/me/delete-account", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      setDeleteConfirmOpen(false);
      await signOutUser();
      clearAuthCookie();
      window.location.href = "/auth/sign-in";
    } catch (e) {
      showToast({
        title: "Could not delete account",
        message: e instanceof Error ? e.message : "Please try again.",
        variant: "danger",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    clearAuthCookie();
    window.location.href = "/auth/sign-in";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Adjust preferences for your workspace."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex h-full min-h-0 flex-col p-4">
          <h3 className="text-sm font-semibold font-heading shrink-0 mb-3">Theme</h3>
          <div className="flex flex-1 min-h-0 flex-col justify-center gap-3">
            <div className="flex gap-2 w-full">
              {(["light", "dark"] as const).map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={theme === t ? "primary" : "secondary"}
                  size="sm"
                  className="flex-1"
                  onClick={() => handleTheme(t)}
                >
                  {t === "light" ? "Light" : "Dark"}
                </Button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--muted-2)]">Applies immediately across the app.</p>
          </div>
        </Card>

        <Card className="flex h-full min-h-0 flex-col space-y-4 p-4">
          <h3 className="text-sm font-semibold font-heading shrink-0">Notifications</h3>
          <div className="flex flex-1 min-h-0 flex-col gap-4">
            <div className="flex items-center justify-between gap-3 text-xs min-w-0">
              <div className="min-w-0">
                <p className="font-medium text-[var(--text)]">
                  Email summaries
                </p>
                <p className="text-[10px] text-[var(--muted-2)]">
                  Occasional summaries of upcoming deadlines.
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onClick={() => setEmailNotifications((v) => !v)}
                aria-label="Toggle email summaries"
                className="shrink-0"
              />
            </div>
            <div className="flex items-center justify-between gap-3 text-xs min-w-0">
              <div className="min-w-0">
                <p className="font-medium text-[var(--text)]">
                  Deadline reminders
                </p>
                <p className="text-[10px] text-[var(--muted-2)]">
                  Gentle reminders inside the app.
                </p>
              </div>
              <Switch
                checked={deadlineReminders}
                onClick={() => setDeadlineReminders((v) => !v)}
                aria-label="Toggle deadline reminders"
                className="shrink-0"
              />
            </div>
            <Button type="button" size="sm" onClick={handleSave} className="mt-auto shrink-0">
              Save notification preferences
            </Button>
          </div>
        </Card>

        <Card className="flex h-full min-h-0 flex-col p-4">
          <h3 className="text-sm font-semibold font-heading shrink-0 mb-3">Account</h3>
          <div className="flex flex-1 min-h-0 flex-col gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-xs font-medium text-[var(--text)]">{displayName || "No name set"}</p>
                <p className="truncate text-[10px] text-[var(--muted-2)]">{email || "No email"}</p>
              </div>
            </div>
            <div className="pt-2 shrink-0">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleSignOut}
              >
                Sign out
              </Button>
            </div>
          </div>
        </Card>

        <Card className="flex h-full min-h-0 flex-col space-y-4 p-4">
          <h3 className="text-sm font-semibold font-heading shrink-0">Data</h3>
          <p className="text-[10px] text-[var(--muted-2)] flex-1 min-h-0">
            Export your profile, applications, and essays as JSON.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExportData}
            disabled={exporting}
            className="shrink-0"
          >
            {exporting ? "Exporting…" : "Export my data"}
          </Button>
        </Card>

        <Card className="flex h-full min-h-0 flex-col space-y-4 p-4">
          <h3 className="text-sm font-semibold font-heading shrink-0">Feedback</h3>
          <p className="text-[10px] text-[var(--muted-2)] flex-1 min-h-0">
            Bug reports, suggestions, or general feedback. We review everything.
          </p>
          <Link href="/app/feedback">
            <Button type="button" variant="secondary" size="sm" className="shrink-0">
              Submit feedback
            </Button>
          </Link>
        </Card>

        <Card className="danger-zone-card flex min-h-0 flex-col gap-4 p-4 md:col-span-2">
          <h3 className="danger-zone-title text-sm font-semibold font-heading shrink-0">Danger zone</h3>
          <div className="space-y-2">
            <p className="text-xs text-[var(--muted-2)]">
              Permanently delete your account and all your data. This cannot be undone.
            </p>
            <p className="danger-zone-muted text-[11px]">
              After deletion you will be signed out and cannot recover your profile, applications, or essays.
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setDeleteConfirmOpen(true)}
            className="shrink-0 self-start"
          >
            Delete account
          </Button>
        </Card>
      </div>

      <Modal
        open={deleteConfirmOpen}
        title="Delete account?"
        description="This will permanently delete your profile, applications, essays, and sign you out. You cannot undo this."
        primaryLabel={deleting ? "Deleting…" : "Delete my account"}
        destructive
        onClose={() => !deleting && setDeleteConfirmOpen(false)}
        onPrimary={handleDeleteAccount}
        primaryDisabled={deleting}
      />
    </div>
  );
}
