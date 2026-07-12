import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Button, EmptyState, Field, Input, SectionCard, StatusPill, Select, Textarea } from '../components/UI';
import { useAuth } from '../context/AuthContext';

export default function Allocations() {
  const { user } = useAuth();
  const [allocations, setAllocations] = useState([]);
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ assetId: '', allocatedTo: '', department: '', type: 'Employee', remarks: '' });

  const load = async () => {
    const [allocationData, assetData, employeeData, departmentData] = await Promise.all([
      api.allocations(),
      api.assets(),
      api.employees(),
      api.departments(),
    ]);
    setAllocations(allocationData);
    setAssets(assetData);
    setEmployees(employeeData);
    setDepartments(departmentData);
    if (!form.assetId && assetData.length) {
      setForm((current) => ({ ...current, assetId: assetData[0]._id }));
    }
    if (!form.allocatedTo && employeeData.length) {
      setForm((current) => ({ ...current, allocatedTo: employeeData[0]._id }));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    await api.createAllocation(form);
    setForm((current) => ({ ...current, remarks: '' }));
    load();
  };

  const requestTransfer = async (allocation) => {
    await api.createTransferRequest({
      assetId: allocation.asset._id,
      fromUser: allocation.allocatedTo._id,
      toUser: user._id,
      note: 'Transfer request submitted from the demo UI',
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <SectionCard title="Allocate asset" subtitle="Prevent duplicate allocation and keep history in the asset timeline">
        <form className="grid gap-4" onSubmit={submit}>
          <Field label="Asset"><Select value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })}>{assets.map((asset) => <option key={asset._id} value={asset._id}>{asset.assetId} - {asset.name}</option>)}</Select></Field>
          <Field label="Allocate to"><Select value={form.allocatedTo} onChange={(e) => setForm({ ...form, allocatedTo: e.target.value })}>{employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name} ({employee.role})</option>)}</Select></Field>
          <Field label="Department"><Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}><option value="">Select department</option>{departments.map((department) => <option key={department._id} value={department._id}>{department.name}</option>)}</Select></Field>
          <Field label="Allocation type"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>Employee</option><option>Department</option></Select></Field>
          <Field label="Remarks"><Textarea rows="4" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Field>
          <Button type="submit">Create allocation</Button>
        </form>
      </SectionCard>

      <SectionCard title="Allocation history" subtitle="Return and transfer actions from the problem statement">
        <div className="space-y-4">
          {allocations.length ? allocations.map((allocation) => (
            <div key={allocation._id} className="rounded-3xl border border-slate-200 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{allocation.asset?.assetId}</h3>
                    <StatusPill tone={allocation.status === 'Active' ? 'green' : 'slate'}>{allocation.status}</StatusPill>
                  </div>
                  <p className="text-sm text-slate-500">{allocation.asset?.name} → {allocation.allocatedTo?.name}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => api.returnAllocation(allocation._id).then(load)}>Return</Button>
                  <Button variant="outline" onClick={() => requestTransfer(allocation)}>Transfer request</Button>
                </div>
              </div>
            </div>
          )) : <EmptyState title="No allocations" description="Allocate an available asset to begin the history trail." />}
        </div>
      </SectionCard>
    </div>
  );
}