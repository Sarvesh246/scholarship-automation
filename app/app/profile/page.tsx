"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useToast } from "@/components/ui/Toast";

export default function ProfilePage() {
  const { showToast } = useToast();
  const [completion] = useState(70);

  const handleSave = () => {
    showToast({
      title: "Profile updated",
      message: "These values are stored in local mock state only.",
      variant: "success"
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        subtitle="Share enough context for strong applications."
      />

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between text-xs">
          <p className="font-medium text-[var(--muted)]">
            Profile completion
          </p>
          <p className="text-[var(--muted-2)]">{completion}%</p>
        </div>
        <ProgressBar value={completion} />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Academics</h3>
          </div>
          <Input label="GPA" placeholder="e.g. 3.7" />
          <Input label="Major / area of study" />
          <Input label="Expected graduation year" />
          <Button type="button" size="sm" onClick={handleSave}>
            Save academics
          </Button>
        </Card>

        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Activities</h3>
          </div>
          <Input label="Activity" placeholder="Community tutoring, robotics club..." />
          <Input label="Role" placeholder="Tutor, team lead..." />
          <Button type="button" size="sm" onClick={handleSave}>
            Save activities
          </Button>
        </Card>

        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-semibold">Awards</h3>
          <Input label="Award name" />
          <Input label="Year" />
          <Button type="button" size="sm" onClick={handleSave}>
            Save awards
          </Button>
        </Card>

        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-semibold">Financial (optional)</h3>
          <Input label="Context" placeholder="Brief notes on your financial situation" />
          <Button type="button" size="sm" onClick={handleSave}>
            Save financial section
          </Button>
        </Card>
      </div>
    </div>
  );
}

