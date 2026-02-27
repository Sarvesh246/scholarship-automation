"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { ScholarshipRowCard } from "@/components/feature/ScholarshipRowCard";
import { scholarships } from "@/data/mockData";

export default function ScholarshipsPage() {
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = scholarships.filter((s) =>
    s.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scholarships"
        subtitle="Browse and choose where to invest your time."
      />

      <div className="flex flex-wrap items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
        <div className="w-full max-w-xs">
          <Input
            placeholder="Search scholarships"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select className="w-40" defaultValue="soonest">
          <option value="soonest">Sort: Soonest deadline</option>
          <option value="amount">Sort: Highest amount</option>
        </Select>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setDrawerOpen(true)}
        >
          Filters
        </Button>
      </div>

      <div className="space-y-3">
        {filtered.map((scholarship) => (
          <ScholarshipRowCard key={scholarship.id} scholarship={scholarship} />
        ))}
      </div>

      <Drawer
        open={drawerOpen}
        title="Filter scholarships"
        onClose={() => setDrawerOpen(false)}
      >
        <div className="space-y-3 text-xs">
          <p className="font-medium text-[var(--muted)]">Deadline</p>
          <Select defaultValue="any">
            <option value="any">Any time</option>
            <option value="30">Next 30 days</option>
            <option value="60">Next 60 days</option>
          </Select>

          <p className="mt-4 font-medium text-[var(--muted)]">Amount</p>
          <Select defaultValue="any">
            <option value="any">Any amount</option>
            <option value="2000">$2,000+</option>
            <option value="5000">$5,000+</option>
          </Select>

          <p className="mt-4 font-medium text-[var(--muted)]">Effort level</p>
          <Select defaultValue="any">
            <option value="any">Any</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </div>
      </Drawer>
    </div>
  );
}

