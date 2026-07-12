import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Button, EmptyState, Field, Input, SectionCard, StatusPill, Select } from '../components/UI';

export default function Audits() {
  const [audits, setAudits] = useState([]);
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ title: 'Q3 Audit Cycle', department: '', auditors: [] });
  const [items, setItems] = useState([]);

  const load = async () => {
    const [auditData, assetData, employeeData, departmentData] = await Promise.all([api.audits(), api.assets(), api.employees(), api.departments()]);
    setAudits(auditData);
    setAssets(assetData);
    setEmployees(employeeData);
    setDepartments(departmentData);
    if (!items.length && assetData.length) {
      setItems(assetData.map((asset) => ({ asset: asset._id, expectedLocation: asset.location || '', verificationStatus: 'Verified', remarks: '' })));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const created = await api.createAudit(form);
    await api.updateAuditItems(created._id, { items });
    load();
  };

  const latest = audits[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Create audit cycle" subtitle="Assign auditors and mark asset verification status">
          <form className="grid gap-4" onSubmit={submit}>
            <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Department"><Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}><option value="">Select department</option>{departments.map((department) => <option key={department._id} value={department._id}>{department.name}</option>)}</Select></Field>
            <Field label="Auditors">
              <select multiple className="h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={form.auditors} onChange={(e) => setForm({ ...form, auditors: Array.from(e.target.selectedOptions, (option) => option.value) })}>
                {employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name} ({employee.role})</option>)}
              </select>
            </Field>
            <Button type="submit">Start audit cycle</Button>
          </form>
        </SectionCard>

        <SectionCard title="Audit line items" subtitle="Mark the current stock against the physical visit">
          <div className="space-y-3 max-h-[34rem] overflow-y-auto pr-1 scrollbar-thin">
            {items.map((item, index) => {
              const asset = assets.find((entry) => entry._id === item.asset);
              return (
                <div key={item.asset} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{asset?.assetId} · {asset?.name}</p>
                      <p className="text-xs text-slate-500">{item.expectedLocation || 'No location set'}</p>
                    </div>
                    <StatusPill tone={item.verificationStatus === 'Verified' ? 'green' : item.verificationStatus === 'Missing' ? 'red' : 'amber'}>{item.verificationStatus}</StatusPill>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <Select value={item.verificationStatus} onChange={(e) => setItems((current) => current.map((entry, currentIndex) => currentIndex === index ? { ...entry, verificationStatus: e.target.value } : entry))}>
                      <option>Verified</option><option>Missing</option><option>Damaged</option>
                    </Select>
                    <Input value={item.expectedLocation} onChange={(e) => setItems((current) => current.map((entry, currentIndex) => currentIndex === index ? { ...entry, expectedLocation: e.target.value } : entry))} placeholder="Expected location" />
                    <Input value={item.remarks} onChange={(e) => setItems((current) => current.map((entry, currentIndex) => currentIndex === index ? { ...entry, remarks: e.target.value } : entry))} placeholder="Remarks" />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Latest discrepancy report" subtitle="Simple summary of the most recent audit cycle">
        {latest ? (
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl bg-slate-100 p-4"><p className="text-sm text-slate-500">Verified</p><p className="text-2xl font-semibold">{latest.items.filter((item) => item.verificationStatus === 'Verified').length}</p></div>
            <div className="rounded-3xl bg-rose-50 p-4"><p className="text-sm text-slate-500">Missing</p><p className="text-2xl font-semibold">{latest.items.filter((item) => item.verificationStatus === 'Missing').length}</p></div>
            <div className="rounded-3xl bg-amber-50 p-4"><p className="text-sm text-slate-500">Damaged</p><p className="text-2xl font-semibold">{latest.items.filter((item) => item.verificationStatus === 'Damaged').length}</p></div>
            <div className="rounded-3xl bg-teal-50 p-4"><p className="text-sm text-slate-500">Cycle</p><p className="text-2xl font-semibold">{latest.title}</p></div>
          </div>
        ) : <EmptyState title="No audit cycles yet" description="Create a cycle to generate the discrepancy report." />}
      </SectionCard>
    </div>
  );
}