'use client';

import { useState } from 'react';
import { PanelLeftOpen } from 'lucide-react';
import Sidebar from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
  sidebar: {
    dataSources: { slug: string; name: string }[];
    currentSource: string;
    periods: {
      id: number;
      start_date: number;
      end_date: number;
      locked: boolean;
    }[];
    currentPeriodId: number;
  };
}

const SIDEBAR_STORAGE_KEY = 'tilittaja-sidebar-hidden';

export default function AppShell({ children, sidebar }: AppShellProps) {
  const [sidebarHidden, setSidebarHidden] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  });

  const toggleSidebar = () => {
    setSidebarHidden((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <div className="flex h-full">
      <div
        className={`shrink-0 overflow-hidden transition-[width] duration-250 ease-out ${
          sidebarHidden ? 'w-0' : 'w-52'
        }`}
      >
        <div
          className={`h-full w-52 transition-transform duration-250 ease-out ${
            sidebarHidden ? '-translate-x-full' : 'translate-x-0'
          }`}
        >
          <Sidebar {...sidebar} onToggle={toggleSidebar} />
        </div>
      </div>
      <main className="relative flex-1 overflow-auto">
        {sidebarHidden ? (
          <button
            type="button"
            onClick={toggleSidebar}
            className="fixed left-4 top-4 z-20 inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-1/95 px-3 py-2 text-sm font-medium text-text-primary shadow-xl shadow-black/30 backdrop-blur-sm transition-all hover:bg-surface-2 hover:border-accent/30 hover:shadow-amber-900/10"
            aria-label="Näytä sivupalkki"
          >
            <PanelLeftOpen className="h-4 w-4 text-accent" />
            Valikko
          </button>
        ) : null}
        {children}
      </main>
    </div>
  );
}
