import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, Search, X, ChevronRight, Clock, User, Wrench,
  AlertCircle, CheckCircle2, Loader2, FileText, Calendar,
  Tag, ClipboardList, Filter,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Button, Field, Input, Select, Textarea, StatusPill,
  Modal, FileUpload, Toast, EmptyState, Spinner,
} from '../components/UI';

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const COLUMNS = [
  { id: 'Pending',            label: 'Pending',             color: 'amber'  },
  { id: 'Approved',           label: 'Approved',            color: 'blue'   },
  { id: 'Technician Assigned',label: 'Technician Assigned', color: 'purple' },
  { id: 'In Progress',        label: 'In Progress',         color: 'teal'   },
  { id: 'Resolved',           label: 'Resolved',            color: 'green'  },
];

const VALID_TRANSITIONS = {
  Pending: ['Approved', 'Rejected'],
  Approved: ['Technician Assigned'],
  'Technician Assigned': ['In Progress'],
  'In Progress': ['Resolved'],
  Resolved: [],
  Rejected: [],
};

const PRIORITY_STYLES = {
  Low:      { pill: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400'  },
  Medium:   { pill: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-400'  },
  High:     { pill: 'bg-rose-100 text-rose-600',     dot: 'bg-rose-500'   },
  Critical: { pill: 'bg-red-100 text-red-700',       dot: 'bg-red-600'    },
};

const COLUMN_STYLES = {
  amber:  { header: 'border-amber-300 bg-amber-50',  badge: 'bg-amber-200 text-amber-800',  drop: 'ring-amber-300'  },
  blue:   { header: 'border-blue-300 bg-blue-50',    badge: 'bg-blue-200 text-blue-800',    drop: 'ring-blue-300'   },
  purple: { header: 'border-violet-300 bg-violet-50',badge: 'bg-violet-200 text-violet-800',drop: 'ring-violet-300' },
  teal:   { header: 'border-teal-300 bg-teal-50',    badge: 'bg-teal-200 text-teal-800',    drop: 'ring-teal-300'   },
  green:  { header: 'border-emerald-300 bg-emerald-50', badge: 'bg-emerald-200 text-emerald-800', drop: 'ring-emerald-300' },
};

const EMPTY_FORM = {
  assetId: '', title: '', description: '', priority: 'Medium', documents: [],
};

const EMPTY_ASSIGN = {
  technicianId: '', technicianNotes: '', expectedCompletionDate: '',
};

const EMPTY_RESOLVE = {
  resolutionNote: '', finalCondition: 'Good', resolvedAt: new Date().toISOString().split('T')[0],
};

/* ─────────────────────────────────────────────
   UTILITY
───────────────────────────────────────────── */
function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function Maintenance() {
  const { user } = useAuth();
  const canManage = ['Admin', 'Asset Manager'].includes(user?.role);

  /* state */
  const [requests, setRequests]         = useState([]);
  const [assets, setAssets]             = useState([]);
  const [employees, setEmployees]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [raiseOpen, setRaiseOpen]       = useState(false);
  const [detailRequest, setDetailRequest] = useState(null);
  const [assignDialog, setAssignDialog] = useState(null); // {request}
  const [resolveDialog, setResolveDialog] = useState(null); // {request}
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [formErrors, setFormErrors]     = useState({});
  const [assignForm, setAssignForm]     = useState(EMPTY_ASSIGN);
  const [resolveForm, setResolveForm]   = useState(EMPTY_RESOLVE);
  const [saving, setSaving]             = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [toast, setToast]               = useState(null);
  const [dragId, setDragId]             = useState(null);
  const [dragOver, setDragOver]         = useState(null);

  /* ── load ── */
  const load = useCallback(async () => {
    try {
      const query = new URLSearchParams();
      if (filterPriority) query.set('priority', filterPriority);
      const [reqRes, assetRes, empRes] = await Promise.allSettled([
        api.maintenance(query.toString() ? `?${query}` : ''),
        api.assets(),
        api.employees(),
      ]);

      if (reqRes.status === 'fulfilled') {
        setRequests(reqRes.value);
      } else {
        showToast('Failed to load maintenance requests', 'error');
      }

      if (assetRes.status === 'fulfilled') {
        setAssets(assetRes.value);
      } else {
        showToast('Failed to load assets', 'error');
      }

      if (empRes.status === 'fulfilled') {
        setEmployees(empRes.value);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterPriority]);

  useEffect(() => { load(); }, [load]);

  /* ── helpers ── */
  const showToast = (message, type = 'error') => setToast({ message, type });

  const byStatus = (status) => {
    const q = search.toLowerCase();
    return requests.filter(r =>
      r.status === status &&
      (!q || r.title?.toLowerCase().includes(q) ||
        r.asset?.assetId?.toLowerCase().includes(q) ||
        r.asset?.name?.toLowerCase().includes(q))
    );
  };

  /* ── raise request ── */
  const validateForm = () => {
    const e = {};
    if (!form.assetId)    e.assetId     = 'Asset is required';
    if (!form.title.trim()) e.title     = 'Issue title is required';
    if (!form.description.trim()) e.description = 'Description is required';
    if (!form.priority)   e.priority    = 'Priority is required';
    return e;
  };

  const submitRaise = async (ev) => {
    ev.preventDefault();
    const errs = validateForm();
    setFormErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      setSaving(true);
      await api.createMaintenance({
        assetId: form.assetId,
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        documents: form.documents,
      });
      showToast('Maintenance request created', 'success');
      setForm(EMPTY_FORM);
      setRaiseOpen(false);
      load();
    } catch (err) {
      showToast(err.message || 'Failed to create request', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (file) => {
    try {
      setUploading(true);
      const result = await api.uploadFile(file);
      setForm(f => ({ ...f, documents: [...f.documents, result] }));
      showToast('File uploaded', 'success');
    } catch (err) {
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  /* ── workflow actions ── */
  const doApprove = async (req) => {
    try {
      const updated = await api.approveMaintenance(req._id);
      setRequests(rs => rs.map(r => r._id === updated._id ? updated : r));
      if (detailRequest?._id === updated._id) setDetailRequest(updated);
      showToast('Request approved – asset moved to Under Maintenance', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to approve', 'error');
    }
  };

  const doReject = async (req) => {
    try {
      const updated = await api.rejectMaintenance(req._id);
      setRequests(rs => rs.map(r => r._id === updated._id ? updated : r));
      if (detailRequest?._id === updated._id) setDetailRequest(updated);
      showToast('Request rejected', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to reject', 'error');
    }
  };

  const submitAssign = async (ev) => {
    ev.preventDefault();
    if (!assignForm.technicianId) {
      showToast('Technician is required', 'error');
      return;
    }
    try {
      setSaving(true);
      const updated = await api.assignTechnician(assignDialog._id, {
        technicianId: assignForm.technicianId,
        technicianNotes: assignForm.technicianNotes,
        expectedCompletionDate: assignForm.expectedCompletionDate || null,
      });
      setRequests(rs => rs.map(r => r._id === updated._id ? updated : r));
      if (detailRequest?._id === updated._id) setDetailRequest(updated);
      setAssignDialog(null);
      setAssignForm(EMPTY_ASSIGN);
      showToast('Technician assigned', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to assign technician', 'error');
    } finally {
      setSaving(false);
    }
  };

  const doStart = async (req) => {
    try {
      const updated = await api.startMaintenance(req._id);
      setRequests(rs => rs.map(r => r._id === updated._id ? updated : r));
      if (detailRequest?._id === updated._id) setDetailRequest(updated);
      showToast('Moved to In Progress', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to start', 'error');
    }
  };

  const submitResolve = async (ev) => {
    ev.preventDefault();
    if (!resolveForm.resolutionNote.trim()) {
      showToast('Resolution notes are required', 'error');
      return;
    }
    try {
      setSaving(true);
      const updated = await api.resolveMaintenance(resolveDialog._id, {
        resolutionNote: resolveForm.resolutionNote.trim(),
        finalCondition: resolveForm.finalCondition,
        resolvedAt: resolveForm.resolvedAt,
      });
      setRequests(rs => rs.map(r => r._id === updated._id ? updated : r));
      if (detailRequest?._id === updated._id) setDetailRequest(updated);
      setResolveDialog(null);
      setResolveForm(EMPTY_RESOLVE);
      showToast('Request resolved – asset returned to Available', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to resolve', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ── drag-and-drop ── */
  const dragRequest = useRef(null);

  const handleDragStart = (req) => {
    if (!canManage) return;
    dragRequest.current = req;
    setDragId(req._id);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDragOver(null);
  };

  const handleDrop = async (targetStatus) => {
    setDragOver(null);
    const req = dragRequest.current;
    if (!req || !canManage) return;
    if (req.status === targetStatus) return;

    const allowed = VALID_TRANSITIONS[req.status] || [];
    if (!allowed.includes(targetStatus)) {
      showToast(`Cannot move from "${req.status}" to "${targetStatus}"`, 'error');
      return;
    }

    // Optimistic update
    setRequests(rs => rs.map(r => r._id === req._id ? { ...r, status: targetStatus } : r));

    try {
      if (req.status === 'Pending' && targetStatus === 'Approved') {
        await doApprove(req);
      } else if (req.status === 'Approved' && targetStatus === 'Technician Assigned') {
        // Rollback optimistic — show dialog instead
        setRequests(rs => rs.map(r => r._id === req._id ? { ...r, status: req.status } : r));
        setAssignForm(EMPTY_ASSIGN);
        setAssignDialog(req);
      } else if (req.status === 'Technician Assigned' && targetStatus === 'In Progress') {
        await doStart(req);
      } else if (req.status === 'In Progress' && targetStatus === 'Resolved') {
        // Rollback optimistic — show dialog
        setRequests(rs => rs.map(r => r._id === req._id ? { ...r, status: req.status } : r));
        setResolveForm({ ...EMPTY_RESOLVE, resolvedAt: new Date().toISOString().split('T')[0] });
        setResolveDialog(req);
      }
    } catch {
      // Rollback
      setRequests(rs => rs.map(r => r._id === req._id ? { ...r, status: req.status } : r));
    }
    dragRequest.current = null;
    setDragId(null);
  };

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <div className="flex h-full flex-col gap-4">

      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by asset, issue…"
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
          />
        </div>

        {/* Priority filter */}
        <div className="relative">
          <Filter className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="appearance-none rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        {/* Raise request button */}
        <Button
          variant="accent"
          className="shrink-0"
          onClick={() => { setForm({ ...EMPTY_FORM, assetId: assets[0]?._id || '' }); setFormErrors({}); setRaiseOpen(true); }}
        >
          <Plus className="h-4 w-4" />
          Raise Request
        </Button>
      </div>

      {/* ── Kanban board ── */}
      {loading ? <Spinner /> : (
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => {
            const cards = byStatus(col.id);
            const style = COLUMN_STYLES[col.color];
            const isDropTarget = dragOver === col.id;
            return (
              <div
                key={col.id}
                className={`flex w-72 shrink-0 flex-col rounded-3xl border-2 transition-all duration-150
                  ${style.header}
                  ${isDropTarget ? `ring-2 ${style.drop} ring-offset-2` : ''}
                `}
                onDragOver={e => { e.preventDefault(); setDragOver(col.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(col.id)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-semibold text-slate-700">{col.label}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${style.badge}`}>
                    {cards.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 pb-4 scrollbar-thin">
                  {cards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-8 text-center">
                      <ClipboardList className="mb-2 h-6 w-6 text-slate-300" />
                      <p className="text-xs text-slate-400">No requests</p>
                    </div>
                  ) : cards.map(req => (
                    <MaintenanceCard
                      key={req._id}
                      request={req}
                      canManage={canManage}
                      isDragging={dragId === req._id}
                      onDragStart={() => handleDragStart(req)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setDetailRequest(req)}
                      onApprove={() => doApprove(req)}
                      onReject={() => doReject(req)}
                      onAssign={() => { setAssignForm(EMPTY_ASSIGN); setAssignDialog(req); }}
                      onStart={() => doStart(req)}
                      onResolve={() => { setResolveForm({ ...EMPTY_RESOLVE, resolvedAt: new Date().toISOString().split('T')[0] }); setResolveDialog(req); }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Raise Request Modal ── */}
      <Modal open={raiseOpen} onClose={() => setRaiseOpen(false)} title="Raise Maintenance Request" wide>
        <form onSubmit={submitRaise} className="space-y-4">
          <Field label="Asset *" error={formErrors.assetId}>
            <Select value={form.assetId} onChange={e => setForm(f => ({ ...f, assetId: e.target.value }))}>
              <option value="">Select an asset…</option>
              {assets.map(a => (
                <option key={a._id} value={a._id}>{a.assetId} – {a.name}</option>
              ))}
            </Select>
          </Field>

          <Field label="Issue Title *" error={formErrors.title}>
            <Input
              placeholder="e.g. Projector Bulb Not Turning On"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </Field>

          <Field label="Description *" error={formErrors.description}>
            <Textarea
              rows={3}
              placeholder="Describe the issue in detail…"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </Field>

          <Field label="Priority *" error={formErrors.priority}>
            <Select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </Select>
          </Field>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Images / Documents (optional)</p>
            <FileUpload
              onFileSelect={handleFileUpload}
              accept="image/*,.pdf,.doc,.docx"
              label="Upload image or document"
              uploading={uploading}
            />
            {form.documents.length > 0 && (
              <div className="mt-2 space-y-1">
                {form.documents.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" />{doc.name}</span>
                    <button type="button" onClick={() => setForm(f => ({ ...f, documents: f.documents.filter((_, j) => j !== i) }))} className="text-slate-400 hover:text-rose-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setRaiseOpen(false)}>Cancel</Button>
            <Button type="submit" variant="accent" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Submitting…' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Technician Assignment Dialog ── */}
      <Modal open={!!assignDialog} onClose={() => setAssignDialog(null)} title="Assign Technician">
        <form onSubmit={submitAssign} className="space-y-4">
          <p className="text-sm text-slate-500">
            Assigning a technician will move <strong>{assignDialog?.asset?.assetId}</strong> – {assignDialog?.title} to <em>Technician Assigned</em>.
          </p>
          <Field label="Technician *">
            <Select value={assignForm.technicianId} onChange={e => setAssignForm(f => ({ ...f, technicianId: e.target.value }))}>
              <option value="">Select technician…</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>{emp.name} ({emp.role})</option>
              ))}
            </Select>
          </Field>
          <Field label="Expected Completion Date">
            <Input
              type="date"
              value={assignForm.expectedCompletionDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setAssignForm(f => ({ ...f, expectedCompletionDate: e.target.value }))}
            />
          </Field>
          <Field label="Internal Notes">
            <Textarea
              rows={2}
              placeholder="Any notes for the technician…"
              value={assignForm.technicianNotes}
              onChange={e => setAssignForm(f => ({ ...f, technicianNotes: e.target.value }))}
            />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAssignDialog(null)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Assignment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Resolution Dialog ── */}
      <Modal open={!!resolveDialog} onClose={() => setResolveDialog(null)} title="Resolve Maintenance Request">
        <form onSubmit={submitResolve} className="space-y-4">
          <p className="text-sm text-slate-500">
            Resolving will close this request and return <strong>{resolveDialog?.asset?.assetId}</strong> to <em>Available</em> status.
          </p>
          <Field label="Resolution Notes *">
            <Textarea
              rows={3}
              placeholder="Describe how the issue was resolved…"
              value={resolveForm.resolutionNote}
              onChange={e => setResolveForm(f => ({ ...f, resolutionNote: e.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Final Asset Condition">
              <Select value={resolveForm.finalCondition} onChange={e => setResolveForm(f => ({ ...f, finalCondition: e.target.value }))}>
                <option>Excellent</option>
                <option>Good</option>
                <option>Fair</option>
                <option>Damaged</option>
              </Select>
            </Field>
            <Field label="Resolution Date">
              <Input
                type="date"
                value={resolveForm.resolvedAt}
                onChange={e => setResolveForm(f => ({ ...f, resolvedAt: e.target.value }))}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setResolveDialog(null)}>Cancel</Button>
            <Button type="submit" variant="accent" disabled={saving}>
              {saving ? 'Resolving…' : 'Mark Resolved'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Card Detail Drawer ── */}
      {detailRequest && (
        <DetailDrawer
          request={detailRequest}
          canManage={canManage}
          onClose={() => setDetailRequest(null)}
          onApprove={() => doApprove(detailRequest)}
          onReject={() => doReject(detailRequest)}
          onAssign={() => { setAssignForm(EMPTY_ASSIGN); setAssignDialog(detailRequest); }}
          onStart={() => doStart(detailRequest)}
          onResolve={() => { setResolveForm({ ...EMPTY_RESOLVE, resolvedAt: new Date().toISOString().split('T')[0] }); setResolveDialog(detailRequest); }}
        />
      )}

      {/* ── Toast ── */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAINTENANCE CARD
───────────────────────────────────────────── */
function MaintenanceCard({ request, canManage, isDragging, onDragStart, onDragEnd, onClick, onApprove, onReject, onAssign, onStart, onResolve }) {
  const pStyle = PRIORITY_STYLES[request.priority] || PRIORITY_STYLES.Medium;
  const isResolved = request.status === 'Resolved';

  return (
    <div
      draggable={canManage}
      onDragStart={canManage ? onDragStart : undefined}
      onDragEnd={canManage ? onDragEnd : undefined}
      onClick={onClick}
      className={`group relative cursor-pointer rounded-2xl border p-3.5 shadow-sm transition-all duration-200
        hover:-translate-y-0.5 hover:shadow-md
        ${isResolved ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-white'}
        ${isDragging ? 'opacity-40 scale-95' : ''}
        ${canManage ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
      `}
    >
      {/* Asset tag + priority */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="font-mono text-xs font-bold text-slate-700">{request.asset?.assetId || '—'}</span>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${pStyle.pill}`}>
          {request.priority}
        </span>
      </div>

      {/* Asset name */}
      <p className="mt-1.5 text-sm font-semibold text-slate-800 leading-tight">
        {request.asset?.name || '—'}
      </p>

      {/* Issue title */}
      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{request.title}</p>

      {/* Technician (if assigned) */}
      {request.assignedTechnician && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <User className="h-3 w-3" />
          <span>{request.assignedTechnician.name}</span>
        </div>
      )}

      {/* Footer: reporter + date */}
      <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
        <span>{request.requestedBy?.name || '—'}</span>
        <span>{fmt(request.createdAt)}</span>
      </div>

      {/* Quick action buttons – shown on hover for managers */}
      {canManage && (
        <QuickActions
          request={request}
          onApprove={onApprove}
          onReject={onReject}
          onAssign={onAssign}
          onStart={onStart}
          onResolve={onResolve}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   QUICK ACTIONS (shown on card hover)
───────────────────────────────────────────── */
function QuickActions({ request, onApprove, onReject, onAssign, onStart, onResolve }) {
  const stopProp = fn => e => { e.stopPropagation(); fn(); };

  if (request.status === 'Pending') return (
    <div className="mt-3 flex gap-1.5 opacity-0 transition group-hover:opacity-100" onClick={e => e.stopPropagation()}>
      <button onClick={stopProp(onApprove)} className="flex-1 rounded-xl bg-blue-500 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-600">Approve</button>
      <button onClick={stopProp(onReject)}  className="flex-1 rounded-xl bg-rose-100 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-200">Reject</button>
    </div>
  );

  if (request.status === 'Approved') return (
    <div className="mt-3 opacity-0 transition group-hover:opacity-100" onClick={e => e.stopPropagation()}>
      <button onClick={stopProp(onAssign)} className="w-full rounded-xl bg-violet-500 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-600">Assign Technician</button>
    </div>
  );

  if (request.status === 'Technician Assigned') return (
    <div className="mt-3 opacity-0 transition group-hover:opacity-100" onClick={e => e.stopPropagation()}>
      <button onClick={stopProp(onStart)} className="w-full rounded-xl bg-teal-500 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-600">Start Work</button>
    </div>
  );

  if (request.status === 'In Progress') return (
    <div className="mt-3 opacity-0 transition group-hover:opacity-100" onClick={e => e.stopPropagation()}>
      <button onClick={stopProp(onResolve)} className="w-full rounded-xl bg-emerald-500 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600">Mark Resolved</button>
    </div>
  );

  return null;
}

/* ─────────────────────────────────────────────
   DETAIL DRAWER
───────────────────────────────────────────── */
function DetailDrawer({ request, canManage, onClose, onApprove, onReject, onAssign, onStart, onResolve }) {
  const pStyle = PRIORITY_STYLES[request.priority] || PRIORITY_STYLES.Medium;

  const statusColor = {
    Pending:              'text-amber-600 bg-amber-50 border-amber-200',
    Approved:             'text-blue-600 bg-blue-50 border-blue-200',
    'Technician Assigned':'text-violet-600 bg-violet-50 border-violet-200',
    'In Progress':        'text-teal-600 bg-teal-50 border-teal-200',
    Resolved:             'text-emerald-600 bg-emerald-50 border-emerald-200',
    Rejected:             'text-rose-600 bg-rose-50 border-rose-200',
  }[request.status] || 'text-slate-600 bg-slate-50 border-slate-200';

  const TIMELINE_STEPS = [
    { key: 'Pending', label: 'Raised', icon: ClipboardList },
    { key: 'Approved', label: 'Approved', icon: CheckCircle2 },
    { key: 'Technician Assigned', label: 'Tech Assigned', icon: User },
    { key: 'In Progress', label: 'In Progress', icon: Wrench },
    { key: 'Resolved', label: 'Resolved', icon: CheckCircle2 },
  ];

  const statusOrder = ['Pending', 'Approved', 'Technician Assigned', 'In Progress', 'Resolved'];
  const currentIdx = statusOrder.indexOf(request.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer panel */}
      <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-500">{request.asset?.assetId}</span>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColor}`}>
                {request.status}
              </span>
            </div>
            <h2 className="mt-1 text-lg font-semibold text-slate-900 leading-tight">{request.title}</h2>
            <p className="text-sm text-slate-500">{request.asset?.name}</p>
          </div>
          <button onClick={onClose} className="rounded-2xl p-2 text-slate-400 hover:bg-slate-100 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 px-6 py-5">

          {/* Timeline */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Status Timeline</p>
            <div className="flex items-center gap-0">
              {TIMELINE_STEPS.map((step, i) => {
                const done = i <= currentIdx && request.status !== 'Rejected';
                const active = i === currentIdx && request.status !== 'Rejected';
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex flex-1 items-center">
                    <div className={`flex flex-col items-center ${i > 0 ? 'flex-1' : ''}`}>
                      {i > 0 && (
                        <div className={`mb-2 h-0.5 w-full ${done ? 'bg-teal-400' : 'bg-slate-200'}`} />
                      )}
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs transition
                        ${active ? 'bg-teal-500 text-white ring-4 ring-teal-100' :
                          done ? 'bg-teal-100 text-teal-600' :
                          'bg-slate-100 text-slate-400'}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <p className={`mt-1 text-center text-[10px] font-medium ${active ? 'text-teal-600' : done ? 'text-teal-500' : 'text-slate-400'}`}>
                        {step.label}
                      </p>
                    </div>
                    {i < TIMELINE_STEPS.length - 1 && (
                      <div className={`h-0.5 flex-1 ${i < currentIdx && request.status !== 'Rejected' ? 'bg-teal-400' : 'bg-slate-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* General info */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">General Information</p>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="Asset Tag" value={request.asset?.assetId} />
              <InfoRow label="Asset Name" value={request.asset?.name} />
              <InfoRow label="Priority" value={
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pStyle.pill}`}>{request.priority}</span>
              } />
              <InfoRow label="Reported By" value={request.requestedBy?.name} />
              <InfoRow label="Created" value={fmt(request.createdAt)} />
              <InfoRow label="Approved By" value={request.approvedBy?.name || '—'} />
              <InfoRow label="Technician" value={request.assignedTechnician?.name || '—'} />
              <InfoRow label="Expected Completion" value={fmt(request.expectedCompletionDate)} />
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Issue Description</p>
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">{request.description || '—'}</p>
          </div>

          {/* Technician notes */}
          {request.technicianNotes && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Technician Notes</p>
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">{request.technicianNotes}</p>
            </div>
          )}

          {/* Resolution */}
          {request.status === 'Resolved' && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Resolution</p>
              <div className="space-y-2 rounded-2xl bg-emerald-50 p-4">
                <p className="text-sm text-emerald-800">{request.resolutionNote || '—'}</p>
                <div className="flex gap-4 text-xs text-emerald-600">
                  <span>Condition: <strong>{request.finalCondition || '—'}</strong></span>
                  <span>Resolved: <strong>{fmt(request.resolvedAt)}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Documents */}
          {request.documents?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Uploaded Documents</p>
              <div className="space-y-2">
                {request.documents.map((doc, i) => (
                  <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 transition">
                    <FileText className="h-4 w-4 text-slate-400" />
                    {doc.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {canManage && (
          <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4">
            <ActionButtons
              status={request.status}
              onApprove={onApprove}
              onReject={onReject}
              onAssign={onAssign}
              onStart={onStart}
              onResolve={onResolve}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <div className="mt-0.5 text-sm font-medium text-slate-800">{value || '—'}</div>
    </div>
  );
}

function ActionButtons({ status, onApprove, onReject, onAssign, onStart, onResolve }) {
  if (status === 'Pending') return (
    <div className="flex gap-3">
      <Button variant="accent" className="flex-1" onClick={onApprove}>
        <CheckCircle2 className="h-4 w-4" /> Approve
      </Button>
      <Button variant="danger" className="flex-1" onClick={onReject}>Reject</Button>
    </div>
  );
  if (status === 'Approved') return (
    <Button variant="primary" className="w-full" onClick={onAssign}>
      <User className="h-4 w-4" /> Assign Technician
    </Button>
  );
  if (status === 'Technician Assigned') return (
    <Button variant="accent" className="w-full" onClick={onStart}>
      <Wrench className="h-4 w-4" /> Start Work
    </Button>
  );
  if (status === 'In Progress') return (
    <Button variant="accent" className="w-full" onClick={onResolve}>
      <CheckCircle2 className="h-4 w-4" /> Mark Resolved
    </Button>
  );
  return null;
}