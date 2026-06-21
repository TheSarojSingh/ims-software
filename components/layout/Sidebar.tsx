'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Layers, BookOpen,
  FileImage, BarChart3, Settings, LogOut,
  ChevronLeft, ChevronRight, Building2,
  ChevronDown, Plus,
} from 'lucide-react';
import { useState } from 'react';
import { useSidebar } from '@/providers/SidebarProvider';
import { useInstitute } from '@/hooks/useInstitute';

// ── Institute-scoped nav (tied to active institute) ─────────────────────────
const INSTITUTE_NAV = [
  { label: 'Dashboard',      href: '/dashboard',                icon: LayoutDashboard },
  { label: 'Faculty',        href: '/dashboard/faculties',      icon: Users },
  { label: 'Sections',       href: '/dashboard/sections',       icon: Layers },
  { label: 'Classes',        href: '/dashboard/classes',        icon: BookOpen },
  { label: 'Routine Import', href: '/dashboard/routine-import', icon: FileImage },
  { label: 'Reports',        href: '/dashboard/reports',        icon: BarChart3 },
];

// ── Global admin nav (not institute-scoped) ─────────────────────────────────
const ADMIN_NAV = [
  { label: 'Institutes', href: '/dashboard/institutes', icon: Building2 },
  { label: 'Settings',   href: '/dashboard/settings',   icon: Settings },
];

// ── Institute switcher ───────────────────────────────────────────────────────
function InstituteSwitcher({ collapsed }: { collapsed: boolean }) {
  const { institutes, activeInstitute, setActiveInstitute, isLoading } = useInstitute();
  const [open, setOpen] = useState(false);

  if (isLoading) return (
    <div className="mx-2 mb-1 px-2 py-2">
      <div className="h-5 bg-zinc-800 rounded animate-pulse" />
    </div>
  );
  if (!activeInstitute) return null;

  return (
    <div className="relative mx-2 mb-1">
      <button
        onClick={() => setOpen(v => !v)}
        title={collapsed ? activeInstitute.name : undefined}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-zinc-800 transition-colors text-left"
      >
        <div className="w-6 h-6 bg-zinc-700 rounded-md flex items-center justify-center shrink-0">
          <span className="text-[9px] font-bold text-zinc-200 leading-none">
            {activeInstitute.shortName.slice(0, 2)}
          </span>
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] text-zinc-600 leading-none mb-0.5 uppercase tracking-wide">Active</div>
              <div className="text-xs font-medium text-zinc-200 truncate">{activeInstitute.shortName}</div>
            </div>
            <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
          </>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className={`absolute ${collapsed ? 'left-10 top-0' : 'left-0 right-0 top-full mt-1'} bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-40 min-w-52 overflow-hidden`}>
            <div className="px-3 pt-2.5 pb-1.5">
              <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-medium">Switch Institute</span>
            </div>
            <div className="p-1.5 space-y-0.5 max-h-60 overflow-y-auto">
              {institutes.map(inst => (
                <button
                  key={inst._id}
                  onClick={() => { setActiveInstitute(inst); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors ${
                    activeInstitute._id === inst._id
                      ? 'bg-zinc-700 text-zinc-100'
                      : 'text-zinc-300 hover:bg-zinc-700/50'
                  }`}
                >
                  <div className="w-5 h-5 bg-zinc-600 rounded flex items-center justify-center shrink-0">
                    <span className="text-[8px] font-bold">{inst.shortName.slice(0, 2)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{inst.name}</div>
                    <div className="text-[9px] text-zinc-500">{inst.shortName}</div>
                  </div>
                  {activeInstitute._id === inst._id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-zinc-700 p-1.5">
              <Link
                href="/dashboard/institutes"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 transition-colors"
              >
                <Plus className="w-3 h-3" /> Manage Institutes
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Reusable nav link ───────────────────────────────────────────────────────
function NavLink({
  href, label, icon: Icon, active, collapsed, muted = false,
}: {
  href: string; label: string; icon: any;
  active: boolean; collapsed: boolean; muted?: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-3 px-2.5 py-2 rounded-md text-sm transition-colors ${
        collapsed ? 'justify-center' : ''
      } ${
        active
          ? 'bg-zinc-800 text-zinc-100'
          : muted
          ? 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900'
          : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

// ── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="h-px bg-zinc-800/60 mx-2 my-1.5" />;
  return (
    <div className="px-2.5 pt-3 pb-1">
      <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-semibold">{label}</span>
    </div>
  );
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { collapsed, toggle } = useSidebar();

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className={`fixed inset-y-0 left-0 bg-zinc-950 border-r border-zinc-800 flex flex-col z-20 transition-[width] duration-200 ${
      collapsed ? 'w-14' : 'w-56'
    }`}>

      {/* Header */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-zinc-800 shrink-0">
        {!collapsed && (
          <span className="text-sm font-bold text-zinc-100 tracking-tight">EduTrack</span>
        )}
        <button
          onClick={toggle}
          title={collapsed ? 'Expand' : 'Collapse'}
          className={`p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors shrink-0 ${
            collapsed ? 'mx-auto' : 'ml-auto'
          }`}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Scrollable nav body */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Institute section ─────────────────────────────────────────── */}
        <div className="pt-2 pb-1">
          <div className="px-2 mb-1">
            <InstituteSwitcher collapsed={collapsed} />
          </div>

          <SectionLabel label="Institute" collapsed={collapsed} />

          <nav className="px-2 space-y-0.5">
            {INSTITUTE_NAV.map(item => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive(item.href)}
                collapsed={collapsed}
              />
            ))}
          </nav>
        </div>

        {/* ── Global admin section ──────────────────────────────────────── */}
        <div className="pt-1 pb-2">
          <SectionLabel label="Global Admin" collapsed={collapsed} />

          <nav className="px-2 space-y-0.5">
            {ADMIN_NAV.map(item => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive(item.href)}
                collapsed={collapsed}
                muted
              />
            ))}
          </nav>
        </div>

      </div>

      {/* Logout */}
      <div className="p-2 border-t border-zinc-800/60 shrink-0">
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-sm text-red-500/60 hover:text-red-400 hover:bg-red-950/30 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

    </aside>
  );
}