import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { Button, EmptyState, Field, Input, SectionCard, StatusPill, Select, Textarea } from '../components/UI';

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [filters, setFilters] = useState({ q: '', status: '', category: '' });
  const [form, setForm] = useState({ name: '', category: '', location: '', serialNumber: '', imageUrl: '', notes: '' });

  const load = async () => {
    const [assetData, categoryData] = await Promise.all([
      api.assets(`?q=${encodeURIComponent(filters.q)}&status=${encodeURIComponent(filters.status)}&category=${encodeURIComponent(filters.category)}`),
      api.categories(),
    ]);
    setAssets(assetData);
    setCategories(categoryData);
    if (!form.category && categoryData.length) {
      setForm((current) => ({ ...current, category: categoryData[0]._id }));
    }
    if (selectedAsset) {
      const refreshed = await api.assetById(selectedAsset._id);
      setSelectedAsset(refreshed);
    }
  };

  useEffect(() => {
    load();
  }, [filters.q, filters.status, filters.category]);

  const submit = async (event) => {
    event.preventDefault();
    await api.saveAsset(form);
    setForm((current) => ({ ...current, name: '', location: '', serialNumber: '', imageUrl: '', notes: '' }));
    load();
  };

  const toneForStatus = (status) => ({
    Available: 'green',
    Allocated: 'blue',
    Reserved: 'amber',
    'Under Maintenance': 'rose',
    Lost: 'red',
    Retired: 'slate',
    Disposed: 'slate',
  }[status] || 'slate');

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <SectionCard title="Register asset" subtitle="Auto-generates the asset ID on the backend">
        <form className="grid gap-4" onSubmit={submit}>
          <Field label="Asset name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
            </Select>
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Location"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
            <Field label="Serial number"><Input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} /></Field>
          </div>
          <Field label="Image URL"><Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></Field>
          <Field label="Notes"><Textarea rows="4" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <Button type="submit">Save asset</Button>
        </form>
      </SectionCard>

      <SectionCard title="Asset register" subtitle="Search, filter, and inspect asset status">
        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Search by name or ID" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
          <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            <option>Available</option>
            <option>Allocated</option>
            <option>Reserved</option>
            <option>Under Maintenance</option>
            <option>Lost</option>
            <option>Retired</option>
            <option>Disposed</option>
          </Select>
          <Select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
            <option value="">All categories</option>
            {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
          </Select>
        </div>

        <div className="mt-5 space-y-4">
          {assets.length ? assets.map((asset) => (
            <button key={asset._id} type="button" onClick={async () => setSelectedAsset(await api.assetById(asset._id))} className="w-full rounded-3xl border border-slate-200 p-4 text-left transition hover:bg-slate-50">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-900">{asset.assetId}</h3>
                    <StatusPill tone={toneForStatus(asset.status)}>{asset.status}</StatusPill>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{asset.name} · {asset.category?.name} · {asset.location || 'No location'}</p>
                  <p className="mt-1 text-xs text-slate-400">Assigned to: {asset.assignedTo?.name || 'Unassigned'}</p>
                </div>
                {asset.imageUrl ? <img src={asset.imageUrl} alt={asset.name} className="h-20 w-28 rounded-2xl object-cover" /> : null}
              </div>
            </button>
          )) : <EmptyState title="No assets found" description="Register the first asset or adjust filters." />}
        </div>

        {selectedAsset ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Asset detail</p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-900">{selectedAsset.assetId} · {selectedAsset.name}</h3>
                <p className="mt-2 text-sm text-slate-500">{selectedAsset.category?.name} · {selectedAsset.location || 'No location'}</p>
              </div>
              <StatusPill tone={toneForStatus(selectedAsset.status)}>{selectedAsset.status}</StatusPill>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Asset history</p>
                <div className="mt-3 space-y-3">
                  {selectedAsset.history?.length ? selectedAsset.history.map((entry, index) => (
                    <div key={index} className="rounded-2xl border border-slate-200 p-3">
                      <p className="text-sm font-semibold text-slate-800">{entry.action}</p>
                      <p className="text-xs text-slate-500">{entry.note}</p>
                    </div>
                  )) : <p className="text-sm text-slate-500">No history entries yet.</p>}
                </div>
              </div>
              <div className="rounded-3xl bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Allocation history</p>
                <div className="mt-3 space-y-3">
                  {selectedAsset.allocations?.length ? selectedAsset.allocations.map((allocation) => (
                    <div key={allocation._id} className="rounded-2xl border border-slate-200 p-3">
                      <p className="text-sm font-semibold text-slate-800">{allocation.allocatedTo?.name}</p>
                      <p className="text-xs text-slate-500">{allocation.type} · {allocation.status}</p>
                    </div>
                  )) : <p className="text-sm text-slate-500">No allocation history available.</p>}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}