import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { api } from '../api/client';
import { Button, StatusPill } from '../components/UI';

const emptySummary = {
  utilization: { total: 0, allocated: 0, available: 0 },
  departmentSummary: [],
  maintenanceStats: {},
  maintenanceFrequency: [],
  maintenanceTrend: [],
  mostUsedAssets: [],
  idleAssets: [],
  attentionAssets: [],
  bookingHeatmap: [],
  bookingCount: 0,
};

const maxCount = (items, key = 'count') => Math.max(1, ...items.map((item) => Number(item[key]) || 0));

function EmptyPanel({ label }) {
  return (
    <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 text-sm font-medium text-slate-400">
      {label}
    </div>
  );
}

function ChartPanel({ title, subtitle, children, meta }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-soft">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {meta ? <StatusPill tone="teal">{meta}</StatusPill> : null}
      </div>
      {children}
    </section>
  );
}

function DepartmentBarChart({ items }) {
  if (!items.length) return <EmptyPanel label="No department allocation data" />;

  const peak = maxCount(items);

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-5 pb-4 pt-5">
      <div className="flex h-36 items-end gap-4 border-b border-slate-200 px-1">
        {items.map((item) => {
          const height = item.count ? Math.max(18, (item.count / peak) * 124) : 8;
          return (
            <div key={item.department} className="group relative flex min-w-0 flex-1 justify-center">
              <div className="w-full max-w-8 rounded-t-lg bg-gradient-to-b from-amber-200 to-amber-400 shadow-sm ring-1 ring-amber-300/70" style={{ height }} />
              <div className="pointer-events-none absolute -top-9 hidden whitespace-nowrap rounded-xl bg-slate-950 px-2 py-1 text-xs font-semibold text-white shadow-lg group-hover:block">
                {item.department}: {item.count}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, items.length)}, minmax(0, 1fr))` }}>
        {items.map((item) => (
          <span key={item.department} className="truncate text-center text-xs font-medium text-slate-600">{item.department}</span>
        ))}
      </div>
    </div>
  );
}

function MaintenanceLineChart({ items }) {
  if (!items.length) return <EmptyPanel label="No maintenance trend data" />;

  const peak = maxCount(items);
  const points = items.map((item, index) => {
    const x = 9 + index * (82 / Math.max(1, items.length - 1));
    const y = 72 - ((Number(item.count) || 0) / peak) * 50;
    return { ...item, x, y };
  });

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-5 pb-4 pt-4">
      <svg viewBox="0 0 100 82" className="h-36 w-full" role="img" aria-label="Maintenance frequency chart">
        {[22, 39, 56, 73].map((y) => (
          <line key={y} x1="7" y1={y} x2="94" y2={y} stroke="#e2e8f0" strokeWidth="1" />
        ))}
        <polyline points={points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => (
          <circle key={`${point.label}-${point.x}`} cx={point.x} cy={point.y} r="3.2" fill="#ffffff" stroke="#ef4444" strokeWidth="2.2" />
        ))}
      </svg>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, items.length)}, minmax(0, 1fr))` }}>
        {items.map((item) => (
          <span key={item.label} className="text-center text-xs font-medium text-slate-600">{item.label}</span>
        ))}
      </div>
    </div>
  );
}

function TextSection({ title, children }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 space-y-2.5 text-sm text-slate-500">{children}</div>
    </section>
  );
}

function ReportLine({ primary, secondary, value, tone = 'slate' }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base">
      <span className="font-semibold text-slate-900">{primary}</span>
      {secondary ? <span className="text-sm text-slate-500">{secondary}</span> : null}
      {value ? <StatusPill tone={tone}>{value}</StatusPill> : null}
    </div>
  );
}

export default function Reports() {
  const [summary, setSummary] = useState(emptySummary);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.reports();
        setSummary({ ...emptySummary, ...data });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const utilizationByDepartment = useMemo(
    () => summary.departmentSummary.map((item) => ({ department: item.department, count: item.count ?? item.totalAssets ?? 0 })),
    [summary.departmentSummary]
  );

  const totalMaintenance = Object.values(summary.maintenanceStats).reduce((total, value) => total + (Number(value) || 0), 0);

  const exportReport = () => {
    const rows = [
      ['Report', 'Metric', 'Value'],
      ['Utilization', 'Total assets', summary.utilization.total],
      ['Utilization', 'Allocated assets', summary.utilization.allocated],
      ['Utilization', 'Available assets', summary.utilization.available],
      ['Bookings', 'Total bookings', summary.bookingCount],
      ...summary.departmentSummary.map((item) => ['Department allocation', item.department, item.count]),
      ...summary.maintenanceFrequency.map((item) => ['Maintenance frequency', item.category, item.count]),
      ...summary.mostUsedAssets.map((item) => ['Most used asset', `${item.name} (${item.assetId})`, item.count]),
      ...summary.idleAssets.map((item) => ['Idle asset', `${item.name} (${item.assetId})`, `${item.idleDays} days`]),
      ...summary.attentionAssets.map((item) => ['Needs attention', `${item.name} (${item.assetId})`, item.reason]),
      ...summary.bookingHeatmap.map((item) => ['Booking heatmap', item.label, item.count]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assetflow-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-soft">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone="teal">Reports & Analytics</StatusPill>
              <StatusPill tone="green">Live data</StatusPill>
            </div>
            <p className="mt-2 text-sm text-slate-500">Operational utilization, maintenance, usage, idle inventory, and exportable report data.</p>
          </div>
          <div className="text-sm font-medium text-slate-500">
            {loading ? 'Loading report...' : `${summary.utilization.total} assets · ${summary.bookingCount} bookings`}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ChartPanel title="Utilization by department" subtitle="Active allocations" meta={`${summary.utilization.allocated} allocated`}>
            <DepartmentBarChart items={utilizationByDepartment} />
          </ChartPanel>

          <ChartPanel title="Maintenance Frequency" subtitle="Requests over the last 6 months" meta={`${totalMaintenance} total`}>
            <MaintenanceLineChart items={summary.maintenanceTrend} />
          </ChartPanel>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <TextSection title="Most used assets">
            {summary.mostUsedAssets.length ? summary.mostUsedAssets.map((item) => (
              <ReportLine key={`${item.assetId}-${item.name}`} primary={item.name} secondary={item.assetId} value={`${item.count} uses`} tone="amber" />
            )) : <p>No usage records yet.</p>}
          </TextSection>

          <TextSection title="Idle assets">
            {summary.idleAssets.length ? summary.idleAssets.map((item) => (
              <ReportLine key={item.assetId} primary={item.name} secondary={item.assetId} value={`unused ${item.idleDays} days`} tone="slate" />
            )) : <p>No idle available assets.</p>}
          </TextSection>
        </div>

        <div className="my-8 border-t border-slate-200" />

        <TextSection title="Assets due for maintenance / nearing retirement">
          {summary.attentionAssets.length ? summary.attentionAssets.map((item) => (
            <ReportLine key={item.assetId} primary={item.name} secondary={item.assetId} value={item.reason} tone={item.priority > 1 ? 'red' : 'amber'} />
          )) : <p>No maintenance or retirement alerts in the next 30 days.</p>}
        </TextSection>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="button" variant="accent" className="sm:w-56" onClick={exportReport} disabled={loading}>
            <Download className="h-4 w-4" /> Export report
          </Button>
          <p className="text-sm text-slate-500">Exports the same live report data shown here.</p>
        </div>
      </section>
    </div>
  );
}
