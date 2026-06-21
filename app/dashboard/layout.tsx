'use client';

import { InstituteProvider } from '@/providers/InstituteProvider';
import { SidebarProvider, useSidebar } from '@/providers/SidebarProvider';
import Sidebar from '@/components/layout/Sidebar';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <main className={`flex-1 min-h-screen overflow-auto transition-[padding] duration-200 ${
        collapsed ? 'pl-14' : 'pl-56'
      }`}>
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <InstituteProvider>
      <SidebarProvider>
        <DashboardShell>{children}</DashboardShell>
      </SidebarProvider>
    </InstituteProvider>
  );
}