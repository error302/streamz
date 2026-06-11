'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/components/ui';
import { LayoutDashboard, Radio, Sparkles, Eye, Send, Menu, BarChart3, Settings, Calendar, Bell } from 'lucide-react';
import { UserButton, useUser } from '@clerk/nextjs';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/streams', label: 'Streams', icon: Radio },
  { href: '/dashboard/highlights', label: 'Highlights', icon: Sparkles },
  { href: '/dashboard/review', label: 'Review', icon: Eye },
  { href: '/dashboard/queue', label: 'Publish Queue', icon: Send },
  { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isSignedIn, isLoaded, user } = useUser();

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={cn(
        'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="p-6 border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">StreamZ</h1>
              <p className="text-xs text-slate-500">Automation Platform</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className="w-5 h-5" />{item.label}
              </Link>
            );
          })}
          <div className="pt-4 mt-4 border-t border-slate-800">
            <Link href="/dashboard/settings" onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname === '/dashboard/settings' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              )}
            >
              <Settings className="w-5 h-5" />Settings
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
          {isLoaded && isSignedIn ? (
            <div className="flex items-center gap-3">
              <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'w-9 h-9 rounded-lg' } }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{user.firstName || user.username || 'User'}</p>
                <p className="text-xs text-slate-500 truncate">{user.emailAddresses[0]?.emailAddress || ''}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-700 animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-slate-700 rounded animate-pulse w-20" />
                <div className="h-2 bg-slate-700 rounded animate-pulse w-28" />
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 min-h-screen">
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-sm border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-400 hover:text-white" aria-label="Open menu">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-white transition-colors" aria-label="Notifications">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
            </button>
            {isLoaded && isSignedIn && (
              <span className="text-sm text-slate-400 hidden sm:inline">Welcome, {user.firstName || 'Creator'}</span>
            )}
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
