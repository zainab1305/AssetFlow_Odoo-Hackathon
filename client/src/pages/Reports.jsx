import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { SectionCard, StatCard, StatusPill } from '../components/UI';

export default function Reports() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.reports().then(setSummary);
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total assets" value={summary?.utilization.total ?? 0} tone="teal" />
        <StatCard label="Allocated" value={summary?.utilization.allocated ?? 0} tone="blue" />
        <StatCard label="Available" value={summary?.utilization.available ?? 0} tone="amber" />
        <StatCard label="Bookings" value={summary?.bookingCount ?? 0} tone="rose" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Department wise allocation summary">
          <div className="space-y-3">
            {summary?.departmentSummary?.map((item) => (
              <div key={item.department} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                <span>{item.department}</span>
                <StatusPill tone="teal">{item.count}</StatusPill>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Maintenance statistics">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-3xl bg-slate-100 p-4">Pending: {summary?.maintenanceStats.pending ?? 0}</div>
            <div className="rounded-3xl bg-slate-100 p-4">Approved: {summary?.maintenanceStats.approved ?? 0}</div>
            <div className="rounded-3xl bg-slate-100 p-4">In Progress: {summary?.maintenanceStats.in_progress ?? 0}</div>
            <div className="rounded-3xl bg-slate-100 p-4">Resolved: {summary?.maintenanceStats.resolved ?? 0}</div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}