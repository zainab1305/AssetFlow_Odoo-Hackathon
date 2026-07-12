import { useEffect, useState } from 'react';
import { ArrowRight, Boxes, CalendarDays, ClipboardList, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Button, SectionCard, StatCard, StatusPill } from '../components/UI';

export default function Dashboard() {
  const [data, setData] = useState({ kpis: {}, recentActivities: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const summary = await api.dashboard();
        setData(summary);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-soft md:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <StatusPill tone="teal">Overview</StatusPill>
            <h2 className="mt-4 text-3xl font-semibold md:text-4xl">AssetFlow dashboard</h2>
            <p className="mt-3 max-w-2xl text-slate-300">
              Track available assets, active bookings, allocation status, and maintenance load from a responsive command center.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link to="/assets"><Button variant="outline" className="bg-white/10 text-white hover:bg-white/15"><Boxes className="h-4 w-4" />Assets</Button></Link>
            <Link to="/bookings"><Button variant="outline" className="bg-white/10 text-white hover:bg-white/15"><CalendarDays className="h-4 w-4" />Bookings</Button></Link>
            <Link to="/allocations"><Button variant="outline" className="bg-white/10 text-white hover:bg-white/15"><ClipboardList className="h-4 w-4" />Allocations</Button></Link>
            <Link to="/maintenance"><Button variant="outline" className="bg-white/10 text-white hover:bg-white/15"><Wrench className="h-4 w-4" />Maintenance</Button></Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Available Assets" value={loading ? '...' : data.kpis.availableAssets ?? 0} hint="Ready for booking or allocation" tone="teal" />
        <StatCard label="Allocated Assets" value={loading ? '...' : data.kpis.allocatedAssets ?? 0} hint="Currently assigned to teams" tone="blue" />
        <StatCard label="Active Bookings" value={loading ? '...' : data.kpis.activeBookings ?? 0} hint="Confirmed or pending reservations" tone="amber" />
        <StatCard label="Pending Maintenance" value={loading ? '...' : data.kpis.pendingMaintenance ?? 0} hint="Requests needing review" tone="rose" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <SectionCard title="Recent activity" subtitle="Latest events from across the system">
          <div className="space-y-3">
            {data.recentActivities?.length ? data.recentActivities.map((item) => (
              <div key={item._id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-teal-500" />
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="text-sm text-slate-500">{item.detail}</p>
                </div>
                <span className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
              </div>
            )) : <div className="text-sm text-slate-500">No activity yet.</div>}
          </div>
        </SectionCard>

        <SectionCard title="Quick actions" subtitle="Most common demo flows">
          <div className="space-y-3">
            <Link to="/assets" className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <span>Create asset record</span><ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/allocations" className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <span>Allocate an asset</span><ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/maintenance" className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <span>Approve maintenance</span><ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/audits" className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <span>Run an audit cycle</span><ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}