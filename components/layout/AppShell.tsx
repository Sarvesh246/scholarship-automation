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
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <SidebarNav />
      <MobileSidebar open={mobileNavOpen} onClose={closeMobileNav} />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar pageTitle={pageTitle} onMobileMenuToggle={toggleMobileNav} />
        <main className="flex-1 px-6 pb-8 pt-6 md:px-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
