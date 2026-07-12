import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, Clock3, History, RotateCcw } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Button,
  EmptyState,
  Field,
  Input,
  Modal,
  SectionCard,
  Select,
  StatusPill,
  Textarea,
  Toast,
} from './UI';

const canManageAllocation = (role) => ['Admin', 'Asset Manager', 'Department Head'].includes(role);

const canAllocateAssets = (role) => ['Admin', 'Asset Manager', 'Department Head'].includes(role);

const canApproveTransfer = (role) => ['Admin', 'Asset Manager', 'Department Head'].includes(role);

const canApproveReturn = (role) => ['Admin', 'Asset Manager', 'Department Head'].includes(role);

const mapStatus = (status) => (status === 'Pending' ? 'Requested' : status);

const toneForAllocationStatus = (status) => {
  if (status === 'Active') return 'green';
  if (status === 'Returned') return 'slate';
  if (status === 'Transferred') return 'blue';
  return 'slate';
};

const toneForTransferStatus = (status) => {
  if (status === 'Approved') return 'green';
  if (status === 'Rejected') return 'red';
  return 'amber';
};

const isOverdue = (allocation) => {
  if (allocation?.status !== 'Active' || !allocation?.expectedReturnDate) return false;
  return new Date(allocation.expectedReturnDate) < new Date();
};

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
};

export default function AssetAllocationTransfer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [allocationOpen, setAllocationOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('allocations');
  const [toast, setToast] = useState(null);
  const [assetSearch, setAssetSearch] = useState('');
  const [conflictMessage, setConflictMessage] = useState('');
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [historyAssetId, setHistoryAssetId] = useState('');
  const [form, setForm] = useState({
    assetId: '',
    allocateeId: '',
    departmentId: '',
    type: 'Employee',
    expectedReturnDate: '',
    remarks: '',
  });
  const [transferForm, setTransferForm] = useState({
    assetId: '',
    reason: '',
    targetDepartment: '',
  });
  const [returnForm, setReturnForm] = useState({
    condition: 'Good',
    notes: '',
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets', 'available'],
    queryFn: () => api.assets('?status=Available'),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.employees(),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.departments(),
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['allocations'],
    queryFn: () => api.allocations(),
  });

  const { data: transferRequests = [] } = useQuery({
    queryKey: ['transferRequests'],
    queryFn: () => api.transferRequests(),
  });

  const { data: history = [] } = useQuery({
    queryKey: ['assetHistory', historyAssetId],
    queryFn: () => api.assetHistory(historyAssetId),
    enabled: Boolean(historyAssetId) && historyOpen,
  });

  useEffect(() => {
    if (!form.assetId && assets.length) {
      setForm((current) => ({ ...current, assetId: assets[0]._id }));
    }
    if (!form.allocateeId && employees.length) {
      setForm((current) => ({ ...current, allocateeId: employees[0]._id }));
    }
  }, [assets, employees, form.assetId, form.allocateeId]);

  const filteredAssets = useMemo(() => {
    const query = assetSearch.trim().toLowerCase();
    if (!query) return assets;
    return assets.filter((asset) => `${asset.assetId} ${asset.name}`.toLowerCase().includes(query));
  }, [assetSearch, assets]);

  const createAllocationMutation = useMutation({
    mutationFn: (payload) => api.createAllocation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setToast({ message: 'Asset allocated successfully', type: 'success' });
      setAllocationOpen(false);
      setConflictMessage('');
      setForm((current) => ({ ...current, remarks: '', expectedReturnDate: '' }));
    },
    onError: (error) => {
      if (error.status === 409) {
        const holderName = error.currentHolder?.name || error.currentHolder || 'the current holder';
        setConflictMessage(`This asset is currently held by ${holderName}.`);
        setTransferForm((current) => ({ ...current, assetId: form.assetId }));
        setTransferOpen(true);
      } else {
        setToast({ message: error.message || 'Could not create allocation', type: 'error' });
      }
    },
  });

  const createTransferMutation = useMutation({
    mutationFn: (payload) => api.createTransferRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transferRequests'] });
      setToast({ message: 'Transfer request submitted', type: 'success' });
      setTransferOpen(false);
      setConflictMessage('');
      setTransferForm({ assetId: '', reason: '', targetDepartment: '' });
    },
    onError: (error) => {
      setToast({ message: error.message || 'Could not submit transfer request', type: 'error' });
    },
  });

  const approveTransferMutation = useMutation({
    mutationFn: (id) => api.approveTransferRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transferRequests'] });
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setToast({ message: 'Transfer approved', type: 'success' });
    },
    onError: (error) => {
      setToast({ message: error.message || 'Approval failed', type: 'error' });
    },
  });

  const rejectTransferMutation = useMutation({
    mutationFn: (id) => api.rejectTransferRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transferRequests'] });
      setToast({ message: 'Transfer request rejected', type: 'success' });
    },
    onError: (error) => {
      setToast({ message: error.message || 'Rejection failed', type: 'error' });
    },
  });

  const returnMutation = useMutation({
    mutationFn: ({ id, payload }) => api.returnAllocation(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      if (historyAssetId) {
        queryClient.invalidateQueries({ queryKey: ['assetHistory', historyAssetId] });
      }
      setToast({ message: 'Asset marked as returned', type: 'success' });
      setReturnOpen(false);
      setReturnForm({ condition: 'Good', notes: '' });
    },
    onError: (error) => {
      setToast({ message: error.message || 'Could not mark asset returned', type: 'error' });
    },
  });

  const handleAllocationSubmit = (event) => {
    event.preventDefault();
    if (conflictMessage) {
      setTransferForm((current) => ({ ...current, assetId: form.assetId }));
      setTransferOpen(true);
      return;
    }

    const payload = {
      assetId: form.assetId,
      allocatedTo: form.allocateeId,
      department: form.type === 'Department' ? form.departmentId : '',
      type: form.type,
      remarks: form.remarks,
      expectedReturnDate: form.expectedReturnDate || undefined,
    };

    createAllocationMutation.mutate(payload);
  };

  const handleTransferSubmit = (event) => {
    event.preventDefault();
    const payload = {
      assetId: transferForm.assetId || form.assetId,
      fromUser: selectedAllocation?.allocatedTo?._id || '',
      toUser: form.allocateeId,
      targetDepartment: transferForm.targetDepartment || '',
      reason: transferForm.reason,
      note: transferForm.reason,
    };
    createTransferMutation.mutate(payload);
  };

  const handleReturnSubmit = (event) => {
    event.preventDefault();
    if (!selectedAllocation) return;
    returnMutation.mutate({
      id: selectedAllocation._id,
      payload: {
        condition: returnForm.condition,
        notes: returnForm.notes,
      },
    });
  };

  const openHistory = (assetId) => {
    setHistoryAssetId(assetId);
    setHistoryOpen(true);
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Asset allocation and transfer"
        subtitle="Allocate available assets, manage ownership conflicts, and keep release history in sync"
        action={
          canAllocateAssets(user?.role) ? (
            <Button onClick={() => setAllocationOpen(true)}>
              Allocate asset
            </Button>
          ) : null
        }
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-full px-3 py-2 text-sm font-semibold ${activeTab === 'allocations' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
            onClick={() => setActiveTab('allocations')}
          >
            Active allocations
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-2 text-sm font-semibold ${activeTab === 'requests' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
            onClick={() => setActiveTab('requests')}
          >
            Transfer requests
          </button>
        </div>
      </SectionCard>

      {conflictMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>{conflictMessage}</span>
          </div>
        </div>
      ) : null}

      {activeTab === 'allocations' ? (
        <SectionCard title="Active allocations" subtitle="Overdue allocations are highlighted for attention">
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Asset</th>
                  <th className="px-4 py-3 font-semibold">Held by</th>
                  <th className="px-4 py-3 font-semibold">Expected return</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {allocations.length ? allocations.map((allocation) => {
                  const overdue = isOverdue(allocation);
                  return (
                    <tr key={allocation._id} className={overdue ? 'bg-amber-50/60' : ''}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{allocation.asset?.assetId}</div>
                        <div className="text-slate-500">{allocation.asset?.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-900">{allocation.allocatedTo?.name || '—'}</div>
                        <div className="text-slate-500">{allocation.department?.name || allocation.type}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-slate-700">
                          <Clock3 className="h-4 w-4" />
                          {formatDate(allocation.expectedReturnDate)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill tone={overdue ? 'amber' : toneForAllocationStatus(allocation.status)}>
                            {allocation.status === 'Active' && overdue ? 'Overdue' : allocation.status}
                          </StatusPill>
                          {allocation.status === 'Active' && overdue ? <StatusPill tone="red">Overdue</StatusPill> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => { setSelectedAllocation(allocation); setReturnOpen(true); }}
                          >
                            <RotateCcw className="h-4 w-4" /> {user?.role === 'Employee' ? 'Request Return' : 'Mark Returned'}
                          </Button>
                          <Button 
                            variant="secondary" 
                            onClick={() => { setSelectedAllocation(allocation); setTransferForm((current) => ({ ...current, assetId: allocation.asset?._id || '' })); setTransferOpen(true); }}
                          >
                            <ArrowRightLeft className="h-4 w-4" /> Transfer
                          </Button>
                          <Button variant="secondary" onClick={() => openHistory(allocation.asset?._id)}>
                            <History className="h-4 w-4" /> History
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="5" className="px-4 py-6">
                      <EmptyState title="No active allocations" description="Create a new allocation to start tracking asset ownership and return dates." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="Transfer requests" subtitle="Approve or reject transfer requests from asset managers and department heads">
          <div className="space-y-3">
            {transferRequests.length ? transferRequests.map((request) => (
              <div key={request._id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{request.asset?.assetId}</h3>
                      <StatusPill tone={toneForTransferStatus(request.status)}>{mapStatus(request.status)}</StatusPill>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Requested by {request.requestedBy?.name || '—'} • Current holder {request.fromUser?.name || '—'}
                    </p>
                  </div>
                  {canManageAllocation(user?.role) ? (
                    <div className="flex gap-2">
                      <Button variant="accent" disabled={approveTransferMutation.isPending} onClick={() => approveTransferMutation.mutate(request._id)}>
                        Approve
                      </Button>
                      <Button variant="outline" disabled={rejectTransferMutation.isPending} onClick={() => rejectTransferMutation.mutate(request._id)}>
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            )) : <EmptyState title="No transfer requests" description="Requests will appear here once a transfer is submitted." />}
          </div>
        </SectionCard>
      )}

      <Modal open={allocationOpen} onClose={() => setAllocationOpen(false)} title="Allocate asset">
        {!canAllocateAssets(user?.role) ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            You do not have permission to allocate assets. Only Asset Managers and Department Heads can allocate.
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={handleAllocationSubmit}>
            <Field label="Select asset">
              <Input
                value={assetSearch}
                placeholder="Search by asset ID or name"
                onChange={(event) => setAssetSearch(event.target.value)}
              />
              <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                  value={form.assetId}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, assetId: event.target.value }));
                    setConflictMessage('');
                  }}
                >
                  <option value="">Choose an available asset</option>
                  {filteredAssets.map((asset) => (
                    <option key={asset._id} value={asset._id}>
                      {asset.assetId} - {asset.name}
                    </option>
                  ))}
                </select>
              </div>
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Allocate to">
                <div className="flex rounded-2xl border border-slate-200 p-1">
                  <button
                    type="button"
                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${form.type === 'Employee' ? 'bg-slate-900 text-white' : 'bg-transparent text-slate-600'}`}
                    onClick={() => setForm((current) => ({ ...current, type: 'Employee' }))}
                  >
                    Employee
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${form.type === 'Department' ? 'bg-slate-900 text-white' : 'bg-transparent text-slate-600'}`}
                    onClick={() => setForm((current) => ({ ...current, type: 'Department' }))}
                  >
                    Department
                  </button>
                </div>
              </Field>

              <Field label={form.type === 'Department' ? 'Department' : 'Employee'}>
                {form.type === 'Department' ? (
                  <Select value={form.departmentId} onChange={(event) => setForm((current) => ({ ...current, departmentId: event.target.value }))}>
                    <option value="">Select department</option>
                    {departments.map((department) => (
                      <option key={department._id} value={department._id}>{department.name}</option>
                    ))}
                  </Select>
                ) : (
                  <Select value={form.allocateeId} onChange={(event) => setForm((current) => ({ ...current, allocateeId: event.target.value }))}>
                    <option value="">Select employee</option>
                    {employees.map((employee) => (
                      <option key={employee._id} value={employee._id}>{employee.name}</option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <Field label="Expected return date" helper="Optional">
              <Input type="date" value={form.expectedReturnDate} onChange={(event) => setForm((current) => ({ ...current, expectedReturnDate: event.target.value }))} />
            </Field>

            <Field label="Notes">
              <Textarea rows="4" value={form.remarks} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} />
            </Field>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setAllocationOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAllocationMutation.isPending}>
                {conflictMessage ? 'Request transfer' : createAllocationMutation.isPending ? 'Allocating...' : 'Allocate asset'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Transfer request">
        <form className="grid gap-4" onSubmit={handleTransferSubmit}>
          <Field label="Reason">
            <Textarea rows="4" value={transferForm.reason} onChange={(event) => setTransferForm((current) => ({ ...current, reason: event.target.value }))} />
          </Field>
          <Field label="Target department (optional)">
            <Select value={transferForm.targetDepartment} onChange={(event) => setTransferForm((current) => ({ ...current, targetDepartment: event.target.value }))}>
              <option value="">No specific department</option>
              {departments.map((department) => (
                <option key={department._id} value={department._id}>{department.name}</option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setTransferOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTransferMutation.isPending}>
              {createTransferMutation.isPending ? 'Submitting...' : 'Submit request'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={returnOpen} onClose={() => setReturnOpen(false)} title={user?.role === 'Employee' ? 'Request Asset Return' : 'Approve Asset Return'}>
        <form className="grid gap-4" onSubmit={handleReturnSubmit}>
          <Field label="Condition">
            <Select value={returnForm.condition} onChange={(event) => setReturnForm((current) => ({ ...current, condition: event.target.value }))}>
              <option>Good</option>
              <option>Fair</option>
              <option>Damaged</option>
            </Select>
          </Field>
          <Field label="Check-in notes">
            <Textarea rows="4" value={returnForm.notes} onChange={(event) => setReturnForm((current) => ({ ...current, notes: event.target.value }))} />
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setReturnOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={returnMutation.isPending}>
              {returnMutation.isPending ? 'Updating...' : 'Mark returned'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Allocation history" wide>
        <div className="space-y-3">
          {history.length ? history.map((entry, index) => (
            <div key={`${entry._id || index}`} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{entry.holderName || entry.allocatedTo?.name || 'Unknown holder'}</p>
                  <p className="text-sm text-slate-500">{formatDate(entry.fromDate || entry.allocatedAt)}</p>
                </div>
                <StatusPill tone="slate">{entry.status || 'Active'}</StatusPill>
              </div>
              <p className="mt-2 text-sm text-slate-600">{entry.notes || entry.remarks || 'No notes recorded'}</p>
            </div>
          )) : <EmptyState title="No history yet" description="This asset has no recorded allocation events yet." />}
        </div>
      </Modal>

      {toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
