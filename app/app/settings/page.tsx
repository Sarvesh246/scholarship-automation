"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { signOutUser } from "@/lib/auth";
import { clearAuthCookie } from "@/lib/cookie";
import { useUser } from "@/hooks/useUser";

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [deadlineReminders, setDeadlineReminders] = useState(true);
  const { showToast } = useToast();
  const { displayName, email, initials } = useUser();

  const handleSave = () => {
    showToast({
      title: "Settings saved",
      message: "Notification toggles are UI-only in this base build.",
      variant: "success"
    });
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
      </div>
    </div>
  );
}
