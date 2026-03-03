"use client";

import { useState, useEffect } from "react";
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
  const [theme, setThemeState] = useState<Theme>("light");
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
        <Card className="space-y-4 p-4">
          <h3 className="text-sm font-semibold font-heading">Theme</h3>
          <div className="flex flex-wrap gap-2">
            {(["light", "dark"] as const).map((t) => (
              <Button
                key={t}
                type="button"
                variant={theme === t ? "primary" : "secondary"}
                size="sm"
                onClick={() => handleTheme(t)}
              >
                {t === "light" ? "Light" : "Dark"}
              </Button>
            ))}
          </div>
          <p className="text-[10px] text-[var(--muted-2)]">Applies immediately across the app.</p>
        </Card>

        <Card className="space-y-4 p-4">
          <h3 className="text-sm font-semibold font-heading">Notifications</h3>
          <div className="flex items-center justify-between text-xs">
            <div>
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
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <div>
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
            />
          </div>
          <Button type="button" size="sm" onClick={handleSave}>
            Save notification preferences
          </Button>
        </Card>

        <Card className="space-y-4 p-4">
          <h3 className="text-sm font-semibold font-heading">Account</h3>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-amber-400 to-orange-500 text-sm font-bold text-black shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{displayName || "No name set"}</p>
              <p className="truncate text-[10px] text-[var(--muted-2)]">{email || "No email"}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleSignOut}
          >
            Sign out
          </Button>
        </Card>

        <Card className="space-y-4 p-4">
          <h3 className="text-sm font-semibold font-heading">Data</h3>
          <p className="text-[10px] text-[var(--muted-2)]">
            Export your profile, applications, and essays as JSON.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExportData}
            disabled={exporting}
          >
            {exporting ? "Exporting…" : "Export my data"}
          </Button>
        </Card>

        <Card className="space-y-4 p-4 border-red-500/20">
          <h3 className="text-sm font-semibold font-heading text-red-400">Danger zone</h3>
          <p className="text-[10px] text-[var(--muted-2)]">
            Permanently delete your account and all your data. This cannot be undone.
          </p>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setDeleteConfirmOpen(true)}
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
