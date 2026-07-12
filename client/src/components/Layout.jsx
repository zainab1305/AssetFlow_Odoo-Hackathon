import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bell, Boxes, ClipboardList, LayoutDashboard, LogOut, Menu, Shield, Users, Wrench, CalendarDays, AlertTriangle, LineChart, Database, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, StatusPill } from './UI';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/organization', label: 'Organization Setup', icon: Users },
  { to: '/assets', label: 'Assets', icon: Boxes },
  { to: '/allocations', label: 'Allocation & Transfer', icon: ClipboardList },
  { to: '/bookings', label: 'Resource Booking', icon: CalendarDays },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/audits', label: 'Audit', icon: Shield },
  { to: '/reports', label: 'Reports', icon: LineChart },
  { to: '/notifications', label: 'Notifications', icon: Bell },
];

const roleBadge = {
  Admin: 'purple',
  'Asset Manager': 'teal',
  'Department Head': 'amber',
  Employee: 'blue',
};

export const Layout = () => {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navItemsForUser = navItems.filter((item) => item.to !== '/organization' || user?.role === 'Admin');

  return (
    <div className="min-h-screen bg-hero-radial text-slate-900">
      <div className="flex min-h-screen">
        <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white/90 shadow-soft backdrop-blur xl:static xl:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 xl:block`}>
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-semibold leading-none">AssetFlow</p>
                  <p className="text-xs text-slate-500">Enterprise asset management</p>
                </div>
              </div>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin">
              {navItemsForUser.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${isActive ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'}`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    <ChevronRight className="ml-auto h-4 w-4 opacity-40" />
                  </NavLink>
                );
              })}
            </nav>
            <div className="border-t border-slate-200 p-4">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Signed in as</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{user?.name}</p>
                    <p className="text-sm text-slate-500">{user?.email}</p>
                  </div>
                  <StatusPill tone={roleBadge[user?.role] || 'slate'}>{user?.role}</StatusPill>
                </div>
              </div>
              <Button variant="secondary" className="mt-4 w-full" onClick={logout}>
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur md:px-6 xl:px-8">
            <div className="flex items-center justify-between gap-4">
              <button className="rounded-2xl border border-slate-200 bg-white p-3 xl:hidden" onClick={() => setOpen((value) => !value)}>
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-sm text-slate-500">{location.pathname.replace('/', '').replace('-', ' ') || 'dashboard'}</p>
                <h1 className="text-lg font-semibold text-slate-900">AssetFlow control center</h1>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" className="hidden md:inline-flex">
                  <AlertTriangle className="h-4 w-4" />
                  Alerts
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-6 xl:px-8">
            <Outlet />
          </main>
        </div>
      </div>
      {open ? <button className="fixed inset-0 z-30 bg-slate-900/40 xl:hidden" onClick={() => setOpen(false)} aria-label="close sidebar" /> : null}
    </div>
  );
};