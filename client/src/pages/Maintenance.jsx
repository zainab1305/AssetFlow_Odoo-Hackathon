import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Button, EmptyState, Field, Input, SectionCard, StatusPill, Select, Textarea } from '../components/UI';
import { useAuth } from '../context/AuthContext';

export default function Maintenance() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState({ assetId: '', title: '', description: '', priority: 'Medium' });

  const load = async () => {
    const [requestData, assetData] = await Promise.all([api.maintenance(), api.assets()]);
    setRequests(requestData);
    setAssets(assetData);
    if (!form.assetId && assetData.length) {
      setForm((current) => ({ ...current, assetId: assetData[0]._id }));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    await api.createMaintenance(form);
    setForm((current) => ({ ...current, title: '', description: '' }));
    load();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <SectionCard title="Raise maintenance request" subtitle="Automatically moves the asset into maintenance status">
        <form className="grid gap-4" onSubmit={submit}>
          <Field label="Asset"><Select value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })}>{assets.map((asset) => <option key={asset._id} value={asset._id}>{asset.assetId} - {asset.name}</option>)}</Select></Field>
          <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Description"><Textarea rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Priority"><Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option>Low</option><option>Medium</option><option>High</option></Select></Field>
          <Button type="submit">Submit request</Button>
        </form>
      </SectionCard>

      <SectionCard title="Maintenance workflow" subtitle="Pending → Approved → In Progress → Resolved">
        <div className="space-y-4">
          {requests.length ? requests.map((request) => (
            <div key={request._id} className="rounded-3xl border border-slate-200 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{request.title}</h3>
                    <StatusPill tone={request.status === 'Resolved' ? 'green' : request.status === 'Rejected' ? 'red' : request.status === 'Approved' ? 'amber' : 'blue'}>{request.status}</StatusPill>
                  </div>
                  <p className="text-sm text-slate-500">{request.asset?.assetId} · {request.asset?.name}</p>
                  <p className="mt-1 text-xs text-slate-400">Priority: {request.priority}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => api.approveMaintenance(request._id).then(load)} disabled={!['Admin', 'Asset Manager'].includes(user?.role)}>Approve</Button>
                  <Button variant="outline" onClick={() => api.startMaintenance(request._id).then(load)} disabled={!['Admin', 'Asset Manager'].includes(user?.role)}>Start</Button>
                  <Button variant="accent" onClick={() => api.resolveMaintenance(request._id, { resolutionNote: 'Resolved in demo workflow' }).then(load)} disabled={!['Admin', 'Asset Manager'].includes(user?.role)}>Resolve</Button>
                  <Button variant="danger" onClick={() => api.rejectMaintenance(request._id).then(load)} disabled={!['Admin', 'Asset Manager'].includes(user?.role)}>Reject</Button>
                </div>
              </div>
            </div>
          )) : <EmptyState title="No maintenance requests" description="Create and approve requests to show the workflow." />}
        </div>
      </SectionCard>
    </div>
  );
}