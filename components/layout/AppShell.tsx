"use client";

import { ReactNode, useState, useCallback } from "react";
import { SidebarNav } from "./SidebarNav";
import { TopBar } from "./TopBar";
import { MobileSidebar } from "./MobileSidebar";
import { PageTransition } from "./PageTransition";

interface AppShellProps {
  children: ReactNode;
  pageTitle?: string;
}

export function AppShell({ children, pageTitle }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const toggleMobileNav = useCallback(() => setMobileNavOpen((v) => !v), []);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <SidebarNav />
      <MobileSidebar open={mobileNavOpen} onClose={closeMobileNav} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopBar pageTitle={pageTitle} onMobileMenuToggle={toggleMobileNav} />
        <main className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto px-6 pb-8 pt-6 md:px-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
