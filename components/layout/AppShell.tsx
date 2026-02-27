"use client";

import { ReactNode } from "react";
import { SidebarNav } from "./SidebarNav";
import { TopBar } from "./TopBar";

interface AppShellProps {
  children: ReactNode;
  pageTitle?: string;
}

export function AppShell({ children, pageTitle }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <SidebarNav />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar pageTitle={pageTitle} />
        <main className="flex-1 px-6 pb-8 pt-4 md:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

