import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus, FileText, TrendingUp, Clock, CheckCircle, XCircle, Upload, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button, Modal, SectionCard, StatusPill, Field, Input, Textarea, Select, FileUpload, Toast, ConfirmDialog, EmptyState } from './UI';

const AssetAudit = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState('cycles'); // cycles, progress, history
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [toast, setToast] = useState(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    scopeType: '', // Department or Location
    scopeValue: '',
    startDate: '',
    endDate: '',
    assignedAuditors: [],
  });
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [assetSelection, setAssetSelection] = useState('');
  const [verifyForm, setVerifyForm] = useState({
    itemId: '',
    verificationStatus: 'Verified',
    remarks: '',
    evidenceFile: null,
  });

  // Queries
  const { data: cycles = [] } = useQuery({
    queryKey: ['auditCycles', user?.role],
    queryFn: () => api.audits(),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.departments(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.employees(),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.assets(),
    enabled: Boolean(user),
  });

  const { data: cycleDetail = null } = useQuery({
    queryKey: ['auditCycle', selectedCycle?._id],
    queryFn: () => api.getAuditCycle(selectedCycle._id),
    enabled: Boolean(selectedCycle),
  });

  const { data: progressData = [] } = useQuery({
    queryKey: ['auditProgress'],
    queryFn: () => api.getAuditProgress(),
    enabled: user?.role === 'Asset Manager',
  });

  // Mutations
  const createCycleMutation = useMutation({
    mutationFn: (payload) => api.createAudit(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['auditCycles'] });
      setToast({ message: `Audit cycle created: ${data.includedCount} assets included, ${data.excludedCount} excluded`, type: 'success' });
      setCreateOpen(false);
      setCreateForm({
        name: '',
        scopeType: '',
        scopeValue: '',
        startDate: '',
        endDate: '',
        assignedAuditors: [],
      });
    },
    onError: (error) => {
      setToast({ message: error.message || 'Failed to create audit cycle', type: 'error' });
    },
  });

  const addAuditItemMutation = useMutation({
    mutationFn: ({ cycleId, assetId }) => api.addAuditItem(cycleId, { assetId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditCycle'] });
      queryClient.invalidateQueries({ queryKey: ['auditCycles'] });
      setToast({ message: 'Asset added to the audit cycle', type: 'success' });
      setAssetModalOpen(false);
      setEditingItemId(null);
      setAssetSelection('');
    },
    onError: (error) => {
      setToast({ message: error.message || 'Failed to add asset to audit cycle', type: 'error' });
    },
  });

  const updateAuditItemMutation = useMutation({
    mutationFn: ({ itemId, assetId }) => api.updateAuditItem(itemId, { assetId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditCycle'] });
      queryClient.invalidateQueries({ queryKey: ['auditCycles'] });
      setToast({ message: 'Audit asset updated', type: 'success' });
      setAssetModalOpen(false);
      setEditingItemId(null);
      setAssetSelection('');
    },
    onError: (error) => {
      setToast({ message: error.message || 'Failed to update audit asset', type: 'error' });
    },
  });

  const verifyItemMutation = useMutation({
    mutationFn: ({ itemId, payload }) => api.verifyAuditItem(itemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditCycle'] });
      queryClient.invalidateQueries({ queryKey: ['auditCycles'] });
      setToast({ message: 'Asset verification submitted', type: 'success' });
      setVerifyForm({
        itemId: '',
        verificationStatus: 'Verified',
        remarks: '',
        evidenceFile: null,
      });
    },
    onError: (error) => {
      setToast({ message: error.message || 'Failed to submit verification', type: 'error' });
    },
  });

  const closeAuditMutation = useMutation({
    mutationFn: (cycleId) => api.closeAuditCycle(cycleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditCycles'] });
      queryClient.invalidateQueries({ queryKey: ['auditProgress'] });
      setToast({ message: 'Audit cycle closed', type: 'success' });
      setDetailOpen(false);
      setSelectedCycle(null);
    },
    onError: (error) => {
      setToast({ message: error.message || 'Failed to close audit cycle', type: 'error' });
    },
  });

  // Helper functions
  const canManageAuditCycles = () => ['Admin', 'Asset Manager'].includes(user?.role);
  const canManageAuditAssets = () => ['Admin', 'Asset Manager'].includes(user?.role);
  const canViewAllCycles = () => ['Admin', 'Asset Manager'].includes(user?.role);
  const isAuditor = () => user?.role === 'Auditor';

  const myAssignedCycles = useMemo(() => {
    if (!isAuditor()) return [];
    return cycles.filter((cycle) =>
      cycle.assignedAuditors.some((auditor) => auditor._id === user._id && cycle.status === 'InProgress')
    );
  }, [cycles, user]);

  const displayCycles = canViewAllCycles() ? cycles : myAssignedCycles;

  const assetOptionsForSelection = useMemo(() => {
    const existingAssetIds = new Set(
      (cycleDetail?.items || [])
        .map((item) => {
          if (typeof item.asset === 'string') return item.asset;
          return item.asset?._id;
        })
        .filter(Boolean)
    );

    const currentAssetId = editingItemId
      ? (cycleDetail?.items?.find((item) => item._id === editingItemId)?.asset?._id ||
          cycleDetail?.items?.find((item) => item._id === editingItemId)?.asset)
      : null;

    return assets.filter((asset) => {
      if (asset.status !== 'Available') return false;
      return asset._id === currentAssetId || !existingAssetIds.has(asset._id);
    });
  }, [assets, cycleDetail?.items, editingItemId]);

  const openAddAssetModal = () => {
    setEditingItemId(null);
    setAssetSelection('');
    setAssetModalOpen(true);
  };

  const openEditAssetModal = (item) => {
    const assetId = typeof item.asset === 'string' ? item.asset : item.asset?._id;
    setEditingItemId(item._id);
    setAssetSelection(assetId || '');
    setAssetModalOpen(true);
  };

  const handleAssetSubmit = (e) => {
    e.preventDefault();

    if (!assetSelection) {
      setToast({ message: 'Please select an asset', type: 'error' });
      return;
    }

    if (editingItemId) {
      updateAuditItemMutation.mutate({ itemId: editingItemId, assetId: assetSelection });
    } else {
      addAuditItemMutation.mutate({ cycleId: selectedCycle?._id, assetId: assetSelection });
    }
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!createForm.name) {
      setToast({ message: 'Cycle name is required', type: 'error' });
      return;
    }
    if (!createForm.scopeType || !createForm.scopeValue) {
      setToast({ message: 'Please select a scope (Department or Location)', type: 'error' });
      return;
    }
    if (new Date(createForm.endDate) < new Date(createForm.startDate)) {
      setToast({ message: 'End date must be after start date', type: 'error' });
      return;
    }
    if (createForm.assignedAuditors.length === 0) {
      setToast({ message: 'At least one auditor must be assigned', type: 'error' });
      return;
    }

    createCycleMutation.mutate(createForm);
  };

  const handleVerifySubmit = async (item) => {
    if (!item.verificationStatus) {
      setToast({ message: 'Please select a verification status', type: 'error' });
      return;
    }

    let evidencePhotoUrl = '';
    if (verifyForm.evidenceFile) {
      try {
        const uploadResponse = await api.uploadFile(verifyForm.evidenceFile);
        evidencePhotoUrl = uploadResponse.url;
      } catch (error) {
        setToast({ message: 'Failed to upload evidence photo', type: 'error' });
        return;
      }
    }

    verifyItemMutation.mutate({
      itemId: item._id,
      payload: {
        verificationStatus: verifyForm.verificationStatus,
        remarks: verifyForm.remarks,
        evidencePhotoUrl,
      },
    });
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const toneForStatus = (status) => {
    const tones = {
      InProgress: 'blue',
      Closed: 'slate',
      Verified: 'green',
      Missing: 'amber',
      Damaged: 'red',
      Pending: 'slate',
    };
    return tones[status] || 'slate';
  };

  // Render: Only show appropriate sections based on role
  if (!user) return null;

  // ===== MANAGER VIEW (Admin/Asset Manager) =====
  if (canViewAllCycles()) {
    return (
      <div className="space-y-4">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('cycles')}
            className={`px-4 py-2 font-medium text-sm transition ${
              activeTab === 'cycles'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Audit Cycles
          </button>
          {user?.role === 'Asset Manager' && (
            <button
              onClick={() => setActiveTab('progress')}
              className={`px-4 py-2 font-medium text-sm transition ${
                activeTab === 'progress'
                  ? 'text-teal-600 border-b-2 border-teal-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Progress
            </button>
          )}
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-medium text-sm transition ${
              activeTab === 'history'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            History
          </button>
        </div>

        {/* CYCLES TAB */}
        {activeTab === 'cycles' && (
          <SectionCard
            title="Audit Cycles"
            subtitle="Create and manage asset audit cycles"
            action={
              canManageAuditCycles() ? (
                <Button variant="accent" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Create Cycle
                </Button>
              ) : null
            }
          >
            <div className="space-y-3">
              {displayCycles.filter((c) => c.status === 'InProgress').length > 0 ? (
                displayCycles
                  .filter((c) => c.status === 'InProgress')
                  .map((cycle) => (
                    <div
                      key={cycle._id}
                      className="rounded-2xl border border-slate-200 p-4 hover:bg-slate-50 cursor-pointer transition"
                      onClick={() => {
                        setSelectedCycle(cycle);
                        setDetailOpen(true);
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900">{cycle.name}</h3>
                            <StatusPill tone={toneForStatus(cycle.status)}>{cycle.status}</StatusPill>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            {cycle.scopeType}: {cycle.scopeValue} • {formatDate(cycle.startDate)} to {formatDate(cycle.endDate)}
                          </p>
                          <div className="mt-2 flex items-center gap-4 text-sm">
                            <span className="text-slate-600">
                              Progress: <strong>{cycle.verificationProgress}</strong>
                            </span>
                            {cycle.discrepancyCount > 0 && (
                              <span className="flex items-center gap-1 text-amber-600">
                                <AlertTriangle className="h-4 w-4" />
                                {cycle.discrepancyCount} discrepancies
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-medium text-slate-900">{cycle.assignedAuditors.length}</p>
                          <p className="text-slate-500">auditors</p>
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <EmptyState title="No active cycles" description="Create a new audit cycle to get started." />
              )}
            </div>
          </SectionCard>
        )}

        {/* PROGRESS TAB (Asset Manager Only) */}
        {activeTab === 'progress' && user?.role === 'Asset Manager' && (
          <SectionCard title="Audit Progress" subtitle="Live view of in-progress audit cycles">
            <div className="space-y-3">
              {progressData.length > 0 ? (
                progressData.map((cycle) => (
                  <div key={cycle._id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{cycle.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Assigned to: {cycle.assignedAuditors.map((a) => a.name).join(', ')}
                        </p>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Completion</span>
                            <strong>{cycle.completionPercent}%</strong>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition"
                              style={{ width: `${cycle.completionPercent}%` }}
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex gap-4 text-xs">
                          <span className="text-slate-600">
                            <strong>{cycle.daysRemaining}</strong> days remaining
                          </span>
                          {cycle.overdueCount > 0 && (
                            <span className="flex items-center gap-1 text-rose-600">
                              <AlertTriangle className="h-3 w-3" />
                              {cycle.overdueCount} overdue
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState title="No in-progress cycles" description="Cycles will appear here when they are active." />
              )}
            </div>
          </SectionCard>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <SectionCard title="Audit History" subtitle="Closed audit cycles">
            <div className="space-y-3">
              {displayCycles.filter((c) => c.status === 'Closed').length > 0 ? (
                displayCycles
                  .filter((c) => c.status === 'Closed')
                  .map((cycle) => (
                    <div
                      key={cycle._id}
                      className="rounded-2xl border border-slate-200 p-4 opacity-75"
                      onClick={() => {
                        setSelectedCycle(cycle);
                        setDetailOpen(true);
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-slate-900">{cycle.name}</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            Closed on {formatDate(cycle.closedDate)} by {cycle.closedBy?.name}
                          </p>
                        </div>
                        <StatusPill tone="slate">Closed</StatusPill>
                      </div>
                    </div>
                  ))
              ) : (
                <EmptyState title="No closed cycles" description="Closed cycles will appear here." />
              )}
            </div>
          </SectionCard>
        )}

        {/* CREATE CYCLE MODAL */}
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Audit Cycle">
          <form className="grid gap-4" onSubmit={handleCreateSubmit}>
            <Field label="Cycle Name">
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g., Q1 2026 IT Assets Audit"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Scope Type">
                <Select
                  value={createForm.scopeType}
                  onChange={(e) => setCreateForm({ ...createForm, scopeType: e.target.value, scopeValue: '' })}
                >
                  <option value="">Select scope...</option>
                  <option value="Department">Department</option>
                  <option value="Location">Location</option>
                </Select>
              </Field>

              {createForm.scopeType === 'Department' && (
                <Field label="Department">
                  <Select
                    value={createForm.scopeValue}
                    onChange={(e) => setCreateForm({ ...createForm, scopeValue: e.target.value })}
                  >
                    <option value="">Select department...</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {createForm.scopeType === 'Location' && (
                <Field label="Location">
                  <Input
                    value={createForm.scopeValue}
                    onChange={(e) => setCreateForm({ ...createForm, scopeValue: e.target.value })}
                    placeholder="e.g., Building A"
                  />
                </Field>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Start Date">
                <Input
                  type="date"
                  value={createForm.startDate}
                  onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                />
              </Field>
              <Field label="End Date">
                <Input
                  type="date"
                  value={createForm.endDate}
                  onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Assign Auditors (min 1)">
              <select
                multiple
                value={createForm.assignedAuditors}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                  setCreateForm({ ...createForm, assignedAuditors: selected });
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
              >
                {employees
                  .filter((emp) => ['Employee', 'Auditor'].includes(emp.role))
                  .map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">{createForm.assignedAuditors.length} auditor(s) selected</p>
            </Field>

            <div className="flex gap-2 pt-4">
              <Button variant="primary" type="submit" disabled={createCycleMutation.isPending}>
                {createCycleMutation.isPending ? 'Creating...' : 'Create Cycle'}
              </Button>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Modal>

        {/* DETAIL MODAL */}
        {selectedCycle && cycleDetail && (
          <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={selectedCycle.name} large>
            <div className="space-y-4">
              {/* Header Info */}
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Status</p>
                    <StatusPill tone={toneForStatus(selectedCycle.status)}>{selectedCycle.status}</StatusPill>
                  </div>
                  <div>
                    <p className="text-slate-500">Date Range</p>
                    <p className="font-medium">
                      {formatDate(selectedCycle.startDate)} - {formatDate(selectedCycle.endDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Scope</p>
                    <p className="font-medium">
                      {selectedCycle.scopeType}: {selectedCycle.scopeValue}
                    </p>
                  </div>
                </div>
              </div>

              {canManageAuditAssets() && (
                <div className="flex justify-end">
                  <Button variant="accent" onClick={openAddAssetModal}>
                    Add Asset
                  </Button>
                </div>
              )}

              {/* Checklist Table */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Asset</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Category</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Verified By</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Remarks</th>
                      {canManageAuditAssets() && <th className="px-4 py-3 text-left font-semibold text-slate-900">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {cycleDetail.items && cycleDetail.items.length > 0 ? (
                      cycleDetail.items.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">{item.asset?.assetId}</td>
                          <td className="px-4 py-3 text-slate-600">{item.asset?.category}</td>
                          <td className="px-4 py-3">
                            <StatusPill tone={toneForStatus(item.verificationStatus)}>{item.verificationStatus}</StatusPill>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{item.verifiedBy?.name || '—'}</td>
                          <td className="px-4 py-3 text-slate-600 truncate">{item.remarks || '—'}</td>
                          {canManageAuditAssets() && (
                            <td className="px-4 py-3">
                              <Button variant="outline" onClick={() => openEditAssetModal(item)}>
                                Edit
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                          No items in this audit cycle
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Close Button (only if no pending and admin-managed) */}
              {selectedCycle.status === 'InProgress' && canManageAuditCycles() && (
                <Button
                  variant="primary"
                  onClick={() => closeAuditMutation.mutate(selectedCycle._id)}
                  disabled={closeAuditMutation.isPending}
                >
                  {closeAuditMutation.isPending ? 'Closing...' : 'Close Audit Cycle'}
                </Button>
              )}
            </div>
          </Modal>
        )}

        <Modal open={assetModalOpen} onClose={() => setAssetModalOpen(false)} title={editingItemId ? 'Edit Audit Asset' : 'Add Asset to Audit Cycle'}>
          <form className="space-y-4" onSubmit={handleAssetSubmit}>
            <Field label={editingItemId ? 'Replace the asset in this audit cycle' : 'Select an asset to add to the audit cycle'}>
              <Select value={assetSelection} onChange={(e) => setAssetSelection(e.target.value)}>
                <option value="">Select asset...</option>
                {assetOptionsForSelection.map((asset) => (
                  <option key={asset._id} value={asset._id}>
                    {asset.assetId} - {asset.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex gap-2 pt-2">
              <Button variant="primary" type="submit" disabled={addAuditItemMutation.isPending || updateAuditItemMutation.isPending}>
                {editingItemId ? 'Save Changes' : 'Add Asset'}
              </Button>
              <Button variant="outline" type="button" onClick={() => setAssetModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // ===== AUDITOR VIEW =====
  if (isAuditor()) {
    return (
      <div className="space-y-4">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <SectionCard
          title="My Assigned Audits"
          subtitle="View and verify assets in your assigned audit cycles"
        >
          <div className="space-y-3">
            {myAssignedCycles.length > 0 ? (
              myAssignedCycles.map((cycle) => (
                <div
                  key={cycle._id}
                  className="rounded-2xl border border-slate-200 p-4 hover:bg-slate-50 cursor-pointer transition"
                  onClick={() => {
                    setSelectedCycle(cycle);
                    setDetailOpen(true);
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{cycle.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {cycle.scopeType}: {cycle.scopeValue} • {formatDate(cycle.startDate)} to {formatDate(cycle.endDate)}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        Progress: <strong>{cycle.verificationProgress}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No assigned audits" description="You will see audit cycles here once you are assigned to them." />
            )}
          </div>
        </SectionCard>

        {/* AUDIT DETAIL MODAL (for Auditors) */}
        {selectedCycle && cycleDetail && isAuditor() && (
          <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={`${selectedCycle.name} - Verification`} large>
            <div className="space-y-4">
              {/* Instructions */}
              <div className="rounded-2xl bg-sky-50 border border-sky-200 p-4 text-sm text-sky-700">
                <p><strong>Verify each asset:</strong> Mark it as Verified, Missing, or Damaged. Add remarks if needed. Upload evidence photo to confirm.</p>
              </div>

              {/* Checklist */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Asset</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {cycleDetail.items && cycleDetail.items.length > 0 ? (
                      cycleDetail.items.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-slate-900">{item.asset?.assetId}</p>
                              <p className="text-xs text-slate-500">{item.asset?.name}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill tone={toneForStatus(item.verificationStatus)}>{item.verificationStatus}</StatusPill>
                          </td>
                          <td className="px-4 py-3">
                            {item.verificationStatus === 'Pending' ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setVerifyForm({ ...verifyForm, itemId: item._id });
                                  // Here you could open a verification modal
                                }}
                              >
                                Verify
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-500">Submitted</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="px-4 py-8 text-center text-slate-500">
                          No items to verify
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  return null;
};

export default AssetAudit;
