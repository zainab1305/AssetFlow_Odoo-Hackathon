import { useEffect, useState, useCallback } from 'react';
import { api, BASE_URL } from '../api/client';
import { Search, Plus, ChevronUp, ChevronDown, Trash2, Eye, Pencil, FileText, Clock, ArrowRightLeft, Wrench, Download, Image } from 'lucide-react';
import {
  Button, EmptyState, Field, Input, Select, StatusPill, Textarea,
  Modal, Checkbox, FileUpload, Spinner, Toast, ConfirmDialog,
} from '../components/UI';
import { useAuth } from '../context/AuthContext';

/* ─── status helpers ─── */
const STATUS_OPTIONS = ['Available', 'Allocated', 'Reserved', 'Under Maintenance', 'Lost', 'Retired', 'Disposed'];
const CONDITION_OPTIONS = ['Excellent', 'Good', 'Fair', 'Damaged'];

const toneForStatus = (status) => ({
  Available: 'green',
  Allocated: 'blue',
  Reserved: 'amber',
  'Under Maintenance': 'rose',
  Lost: 'red',
  Retired: 'slate',
  Disposed: 'slate',
}[status] || 'slate');

const toneForCondition = (condition) => ({
  Excellent: 'green',
  Good: 'teal',
  Fair: 'amber',
  Damaged: 'red',
}[condition] || 'slate');

/* ─── empty form ─── */
const emptyForm = {
  name: '',
  category: '',
  location: '',
  serialNumber: '',
  acquisitionDate: '',
  acquisitionCost: '',
  condition: 'Good',
  isBookable: false,
  imageUrl: '',
  notes: '',
  documents: [],
};

/* ─── file url helper ─── */
const fileUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path}`;
};

export default function Assets() {
  /* ──── state ──── */
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');

  // modals
  const [registerOpen, setRegisterOpen] = useState(false);
  const [detailAsset, setDetailAsset] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // form
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // toast / confirm
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { user } = useAuth();
  const canManage = user?.role === 'Asset Manager' || user?.role === 'Admin';

  /* ──── data loading ──── */
  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (filterStatus) params.set('status', filterStatus);
    if (filterCategory) params.set('category', filterCategory);
    if (filterDepartment) params.set('department', filterDepartment);
    const sortStr = sortDir === 'desc' ? `-${sortField}` : sortField;
    params.set('sort', sortStr);
    return `?${params.toString()}`;
  }, [search, filterStatus, filterCategory, filterDepartment, sortField, sortDir]);

  const loadAssets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.assets(buildQuery());
      setAssets(data);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load assets', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  const loadMeta = async () => {
    try {
      const [catData, deptData] = await Promise.all([api.categories(), api.departments()]);
      setCategories(catData);
      setDepartments(deptData);
    } catch {
      // silent — categories/departments may still load later
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  /* ──── sorting ──── */
  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc'
      ? <ChevronUp className="inline h-3.5 w-3.5" />
      : <ChevronDown className="inline h-3.5 w-3.5" />;
  };

  /* ──── registration ──── */
  const validateForm = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Asset name is required';
    if (!form.category) errors.category = 'Category is required';
    return errors;
  };

  const handleFileUpload = async (file) => {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setToast({ message: 'File too large. Maximum 10 MB.', type: 'error' });
      return;
    }
    try {
      setUploading(true);
      const result = await api.uploadFile(file);
      if (result.type === 'image' && !form.imageUrl) {
        setForm((f) => ({
          ...f,
          imageUrl: result.url,
          documents: [...f.documents, result],
        }));
      } else {
        setForm((f) => ({
          ...f,
          documents: [...f.documents, result],
        }));
      }
      setToast({ message: 'File uploaded', type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Upload failed', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = (index) => {
    setForm((f) => {
      const docs = [...f.documents];
      const removed = docs.splice(index, 1)[0];
      const newForm = { ...f, documents: docs };
      if (removed.url === f.imageUrl) newForm.imageUrl = '';
      return newForm;
    });
  };

  const submitAsset = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        category: form.category,
        location: form.location.trim(),
        serialNumber: form.serialNumber.trim(),
        acquisitionDate: form.acquisitionDate || null,
        acquisitionCost: form.acquisitionCost ? Number(form.acquisitionCost) : 0,
        condition: form.condition,
        isBookable: form.isBookable,
        imageUrl: form.imageUrl,
        documents: form.documents,
        notes: form.notes.trim(),
      };

      await api.saveAsset(payload);
      setToast({ message: 'Asset registered successfully', type: 'success' });
      setForm(emptyForm);
      setFormErrors({});
      setRegisterOpen(false);
      loadAssets();
    } catch (err) {
      if (err.status === 409 && err.field === 'serialNumber') {
        setFormErrors((prev) => ({ ...prev, serialNumber: 'Serial number already exists' }));
      } else {
        setToast({ message: err.message || 'Failed to register asset', type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  /* ──── detail ──── */
  const openDetail = async (assetId) => {
    try {
      const data = await api.assetById(assetId);
      setDetailAsset(data);
      setDetailOpen(true);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load asset', type: 'error' });
    }
  };

  /* ──── delete ──── */
  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteAsset(confirmDelete._id);
      setToast({ message: 'Asset deleted', type: 'success' });
      setConfirmDelete(null);
      if (detailAsset?._id === confirmDelete._id) {
        setDetailOpen(false);
        setDetailAsset(null);
      }
      loadAssets();
    } catch (err) {
      setToast({ message: err.message || 'Failed to delete', type: 'error' });
    }
  };

  /* ──── render ──── */
  return (
    <div className="space-y-5">

      {/* ─── Top bar: Search + Register button ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by tag, serial, or QR code.."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
          />
        </div>
        {canManage && (
          <Button
            variant="accent"
            className="shrink-0"
            onClick={() => {
              setForm({ ...emptyForm, category: categories[0]?._id || '' });
              setFormErrors({});
              setRegisterOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Register Asset
          </Button>
        )}
      </div>

      {/* ─── Filter pills ─── */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition hover:bg-slate-50 focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
        >
          <option value="">Category</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition hover:bg-slate-50 focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
        >
          <option value="">Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition hover:bg-slate-50 focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
        >
          <option value="">Department</option>
          {departments.map((d) => (
            <option key={d._id} value={d._id}>{d.name}</option>
          ))}
        </select>

        {/* Clear filters */}
        {(filterCategory || filterStatus || filterDepartment) && (
          <button
            type="button"
            onClick={() => {
              setFilterCategory('');
              setFilterStatus('');
              setFilterDepartment('');
            }}
            className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ─── Asset table ─── */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-soft">
        {loading ? (
          <Spinner />
        ) : assets.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No assets found"
              description="Register the first asset or adjust filters."
              action={
                canManage ? (
                  <Button
                    variant="accent"
                    onClick={() => {
                      setForm({ ...emptyForm, category: categories[0]?._id || '' });
                      setFormErrors({});
                      setRegisterOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Register Asset
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-gradient-to-r from-teal-50/60 to-emerald-50/40">
                  <th className="cursor-pointer whitespace-nowrap px-5 py-3.5 font-semibold text-slate-700" onClick={() => toggleSort('assetId')}>
                    Tag <SortIcon field="assetId" />
                  </th>
                  <th className="cursor-pointer whitespace-nowrap px-5 py-3.5 font-semibold text-slate-700" onClick={() => toggleSort('name')}>
                    Name <SortIcon field="name" />
                  </th>
                  <th className="cursor-pointer whitespace-nowrap px-5 py-3.5 font-semibold text-slate-700" onClick={() => toggleSort('category')}>
                    Category <SortIcon field="category" />
                  </th>
                  <th className="cursor-pointer whitespace-nowrap px-5 py-3.5 font-semibold text-slate-700" onClick={() => toggleSort('status')}>
                    Status <SortIcon field="status" />
                  </th>
                  <th className="cursor-pointer whitespace-nowrap px-5 py-3.5 font-semibold text-slate-700" onClick={() => toggleSort('location')}>
                    Location <SortIcon field="location" />
                  </th>
                  <th className="whitespace-nowrap px-5 py-3.5 font-semibold text-slate-700 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr
                    key={asset._id}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50/70 cursor-pointer"
                    onClick={() => openDetail(asset._id)}
                  >
                    <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-900">{asset.assetId}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">{asset.name}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{asset.category?.name || '—'}</td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <StatusPill tone={toneForStatus(asset.status)}>{asset.status}</StatusPill>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{asset.location || '—'}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          title="View details"
                          onClick={() => openDetail(asset._id)}
                          className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canManage && (
                          <button
                            type="button"
                            title="Delete asset"
                            onClick={() => setConfirmDelete(asset)}
                            className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Register Asset modal ─── */}
      <Modal open={registerOpen} onClose={() => setRegisterOpen(false)} title="Register asset" wide>
        <form onSubmit={submitAsset} className="space-y-5">
          <p className="text-xs text-slate-400">Asset tag will be auto-generated (e.g. AF-0001)</p>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Asset name *" error={formErrors.name}>
              <Input
                placeholder="e.g. Dell Laptop"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Category *" error={formErrors.category}>
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Serial number" error={formErrors.serialNumber}>
              <Input
                placeholder="e.g. SN-12345"
                value={form.serialNumber}
                onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
              />
            </Field>
            <Field label="Location">
              <Input
                placeholder="e.g. HQ Floor 2"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Acquisition date">
              <Input
                type="date"
                value={form.acquisitionDate}
                onChange={(e) => setForm({ ...form, acquisitionDate: e.target.value })}
              />
            </Field>
            <Field label="Acquisition cost">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.acquisitionCost}
                onChange={(e) => setForm({ ...form, acquisitionCost: e.target.value })}
              />
            </Field>
            <Field label="Condition">
              <Select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                {CONDITION_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Notes">
            <Textarea
              rows="3"
              placeholder="Optional notes about this asset"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>

          <Checkbox
            label="Shared / Bookable"
            checked={form.isBookable}
            onChange={(e) => setForm({ ...form, isBookable: e.target.checked })}
          />

          {/* file upload */}
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Photo / Documents</p>
            <FileUpload
              onFileSelect={handleFileUpload}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              label="Upload photo or document"
              uploading={uploading}
            />
            {form.imageUrl && (
              <div className="mt-3">
                <img src={fileUrl(form.imageUrl)} alt="Preview" className="h-24 w-32 rounded-2xl object-cover border border-slate-200" />
              </div>
            )}
            {form.documents.length > 0 && (
              <div className="mt-3 space-y-2">
                {form.documents.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <FileText className="h-4 w-4 text-slate-400" />
                      {doc.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDocument(i)}
                      className="text-slate-400 hover:text-rose-500 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setRegisterOpen(false)}>Cancel</Button>
            <Button type="submit" variant="accent" disabled={saving}>
              {saving ? 'Saving...' : 'Save asset'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── Asset detail modal ─── */}
      <Modal open={detailOpen} onClose={() => { setDetailOpen(false); setDetailAsset(null); }} title="Asset details" wide>
        {detailAsset && (
          <div className="space-y-6">
            {/* General info */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-semibold text-slate-900">{detailAsset.assetId}</h3>
                  <StatusPill tone={toneForStatus(detailAsset.status)}>{detailAsset.status}</StatusPill>
                  <StatusPill tone={toneForCondition(detailAsset.condition)}>{detailAsset.condition || 'N/A'}</StatusPill>
                </div>
                <p className="mt-2 text-lg text-slate-700">{detailAsset.name}</p>
              </div>
              {detailAsset.imageUrl && (
                <img src={fileUrl(detailAsset.imageUrl)} alt={detailAsset.name} className="h-24 w-32 rounded-2xl object-cover border border-slate-200" />
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem label="Category" value={detailAsset.category?.name || '—'} />
              <InfoItem label="Serial number" value={detailAsset.serialNumber || '—'} />
              <InfoItem label="Location" value={detailAsset.location || '—'} />
              <InfoItem label="Department" value={detailAsset.department?.name || '—'} />
              <InfoItem label="Assigned to" value={detailAsset.assignedTo?.name || 'Unassigned'} />
              <InfoItem label="Acquisition date" value={detailAsset.acquisitionDate ? new Date(detailAsset.acquisitionDate).toLocaleDateString() : detailAsset.purchaseDate ? new Date(detailAsset.purchaseDate).toLocaleDateString() : '—'} />
              <InfoItem label="Acquisition cost" value={detailAsset.acquisitionCost ? `₹${detailAsset.acquisitionCost.toLocaleString()}` : '—'} />
              <InfoItem label="Bookable" value={detailAsset.isBookable ? 'Yes' : 'No'} />
              <InfoItem label="Created" value={new Date(detailAsset.createdAt).toLocaleDateString()} />
            </div>

            {detailAsset.notes && (
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Notes</p>
                <p className="text-sm text-slate-600">{detailAsset.notes}</p>
              </div>
            )}

            {/* Tabs-like sections */}
            <div className="grid gap-5 md:grid-cols-2">
              {/* Asset History */}
              <HistoryPanel
                icon={Clock}
                title="Asset history"
                items={detailAsset.history}
                renderItem={(entry, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-800">{entry.action}</p>
                    <p className="text-xs text-slate-500">{entry.note}</p>
                    <p className="mt-1 text-xs text-slate-400">{entry.by?.name || ''} · {new Date(entry.at).toLocaleString()}</p>
                  </div>
                )}
                emptyText="No history entries yet."
              />

              {/* Allocation History */}
              <HistoryPanel
                icon={ArrowRightLeft}
                title="Allocation history"
                items={detailAsset.allocations}
                renderItem={(alloc) => (
                  <div key={alloc._id} className="rounded-2xl border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-800">{alloc.allocatedTo?.name || 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{alloc.type} · {alloc.status}</p>
                    <p className="mt-1 text-xs text-slate-400">{new Date(alloc.allocatedAt).toLocaleDateString()}{alloc.returnedAt ? ` → ${new Date(alloc.returnedAt).toLocaleDateString()}` : ''}</p>
                  </div>
                )}
                emptyText="No allocation history available."
              />

              {/* Maintenance History */}
              <HistoryPanel
                icon={Wrench}
                title="Maintenance history"
                items={detailAsset.maintenanceRecords}
                renderItem={(record) => (
                  <div key={record._id} className="rounded-2xl border border-slate-200 p-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{record.title}</p>
                      <StatusPill tone={record.status === 'Resolved' ? 'green' : record.status === 'Rejected' ? 'red' : 'amber'}>{record.status}</StatusPill>
                    </div>
                    <p className="text-xs text-slate-500">{record.description}</p>
                    <p className="mt-1 text-xs text-slate-400">By {record.requestedBy?.name || '—'} · {new Date(record.createdAt).toLocaleDateString()}</p>
                  </div>
                )}
                emptyText="No maintenance history available."
              />

              {/* Documents */}
              <div className="rounded-3xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-slate-500" />
                  <p className="text-sm font-semibold text-slate-900">Documents</p>
                </div>
                <div className="space-y-2">
                  {detailAsset.documents?.length ? detailAsset.documents.map((doc, i) => (
                    <a
                      key={i}
                      href={fileUrl(doc.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-2">
                        {doc.type === 'image' ? <Image className="h-4 w-4 text-slate-400" /> : <FileText className="h-4 w-4 text-slate-400" />}
                        {doc.name}
                      </span>
                      <Download className="h-4 w-4 text-slate-400" />
                    </a>
                  )) : (
                    <p className="text-sm text-slate-500">No documents uploaded.</p>
                  )}
                </div>
              </div>
            </div>

            {/* QR Code if backend returns one */}
            {detailAsset.qrCode && (
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <img src={detailAsset.qrCode} alt="QR Code" className="h-24 w-24" />
                <p className="text-sm text-slate-500">Scan to view asset</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
              {canManage && (
                <Button variant="danger" onClick={() => { setConfirmDelete(detailAsset); }}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
              <Button variant="secondary" onClick={() => { setDetailOpen(false); setDetailAsset(null); }}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Confirm delete ─── */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete asset"
        message={`Are you sure you want to delete ${confirmDelete?.assetId} — ${confirmDelete?.name}? This action will mark the asset as disposed.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* ─── Toast ─── */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ─── Small sub-components ─── */

const InfoItem = ({ label, value }) => (
  <div className="rounded-2xl bg-slate-50 px-4 py-3">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
  </div>
);

const HistoryPanel = ({ icon: Icon, title, items, renderItem, emptyText }) => (
  <div className="rounded-3xl bg-slate-50 p-4">
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-slate-500" />
      <p className="text-sm font-semibold text-slate-900">{title}</p>
    </div>
    <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
      {items?.length ? items.map(renderItem) : (
        <p className="text-sm text-slate-500">{emptyText}</p>
      )}
    </div>
  </div>
);