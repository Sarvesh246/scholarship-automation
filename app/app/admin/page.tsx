"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

const adminSections = [
  {
    href: "/app/admin/scholarships",
    title: "Scholarships",
    description: "Add, edit, or remove scholarships. View and manage all scholarships in Firestore.",
    icon: (
      <svg className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    href: "/app/admin/sync",
    title: "Sync scholarships",
    description: "Run ScholarshipOwl, Grants.gov, or custom URL sync. Pull from APIs into Firestore.",
    icon: (
      <svg className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    href: "/app/admin/scrape",
    title: "Scrape scholarships",
    description: "Scrape CollegeScholarships.org, Bold.org, Scholarships360, CollegeData, and more. Add thousands of scholarships automatically.",
    icon: (
      <svg className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin"
        subtitle="Manage scholarships and run syncs from the website."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {adminSections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="flex h-full flex-col gap-3 p-5 transition-all hover:border-amber-500/30 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                {section.icon}
              </div>
              <div>
                <h2 className="font-semibold font-heading text-[var(--text)]">{section.title}</h2>
                <p className="mt-1 text-xs text-[var(--muted)]">{section.description}</p>
              </div>
              <span className="mt-auto text-xs font-medium text-amber-400">Open →</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
