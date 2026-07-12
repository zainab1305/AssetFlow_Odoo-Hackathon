import express from 'express';
import MaintenanceRequest from '../models/MaintenanceRequest.js';
import Asset from '../models/Asset.js';
import Notification from '../models/Notification.js';
import { protect, allowRoles } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = express.Router();

// Valid transitions map
const VALID_TRANSITIONS = {
  Pending: ['Approved', 'Rejected'],
  Approved: ['Technician Assigned'],
  'Technician Assigned': ['In Progress'],
  'In Progress': ['Resolved'],
  Resolved: [],
  Rejected: [],
};

// GET all maintenance requests (with filters)
router.get('/', protect, async (req, res) => {
  const { status, priority, search } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const requests = await MaintenanceRequest.find(filter)
    .populate('asset', 'assetId name status department')
    .populate('requestedBy', 'name email role department')
    .populate('approvedBy', 'name email role')
    .populate('assignedTechnician', 'name email role')
    .sort({ createdAt: -1 });

  res.json(requests);
});

// GET single maintenance request
router.get('/:id', protect, async (req, res) => {
  const request = await MaintenanceRequest.findById(req.params.id)
    .populate('asset', 'assetId name status location department category')
    .populate('requestedBy', 'name email role')
    .populate('approvedBy', 'name email role')
    .populate('assignedTechnician', 'name email role');

  if (!request) return res.status(404).json({ message: 'Request not found' });
  res.json(request);
});

// POST create maintenance request
// Asset status does NOT change on creation — only on approval
router.post('/', protect, async (req, res) => {
  const { assetId, title, description, priority, documents } = req.body;

  if (!assetId || !title || !description || !priority) {
    return res.status(400).json({ message: 'Asset, title, description and priority are required' });
  }

  const request = await MaintenanceRequest.create({
    asset: assetId,
    requestedBy: req.user._id,
    title,
    description,
    priority,
    documents: documents || [],
    status: 'Pending',
  });

  const populated = await MaintenanceRequest.findById(request._id)
    .populate('asset', 'assetId name status')
    .populate('requestedBy', 'name email role');

  await logActivity({ title: 'Maintenance requested', detail: title, type: 'maintenance', user: req.user._id });
  res.status(201).json(populated);
});

// PATCH approve
router.patch('/:id/approve', protect, allowRoles('Admin', 'Asset Manager'), async (req, res) => {
  const existing = await MaintenanceRequest.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Request not found' });
  if (existing.status !== 'Pending') {
    return res.status(400).json({ message: `Cannot approve from status "${existing.status}"` });
  }

  const request = await MaintenanceRequest.findByIdAndUpdate(
    req.params.id,
    { status: 'Approved', approvedBy: req.user._id },
    { new: true }
  )
    .populate('asset', 'assetId name status')
    .populate('requestedBy', 'name email role')
    .populate('approvedBy', 'name email role')
    .populate('assignedTechnician', 'name email role');

  // Move asset to Under Maintenance on approval
  await Asset.findByIdAndUpdate(existing.asset, { status: 'Under Maintenance' });

  await Notification.create({
    user: existing.requestedBy,
    title: 'Maintenance approved',
    message: `${existing.title} has been approved`,
    type: 'success',
    entityId: request._id.toString(),
  });

  await logActivity({ title: 'Maintenance approved', detail: existing.title, type: 'maintenance', user: req.user._id });
  res.json(request);
});

// PATCH reject
router.patch('/:id/reject', protect, allowRoles('Admin', 'Asset Manager'), async (req, res) => {
  const existing = await MaintenanceRequest.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Request not found' });
  if (existing.status !== 'Pending') {
    return res.status(400).json({ message: `Cannot reject from status "${existing.status}"` });
  }

  const request = await MaintenanceRequest.findByIdAndUpdate(
    req.params.id,
    { status: 'Rejected', approvedBy: req.user._id },
    { new: true }
  )
    .populate('asset', 'assetId name status')
    .populate('requestedBy', 'name email role')
    .populate('approvedBy', 'name email role');

  await logActivity({ title: 'Maintenance rejected', detail: existing.title, type: 'maintenance', user: req.user._id });
  res.json(request);
});

// PATCH assign technician (Approved → Technician Assigned)
router.patch('/:id/assign-technician', protect, allowRoles('Admin', 'Asset Manager'), async (req, res) => {
  const existing = await MaintenanceRequest.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Request not found' });
  if (existing.status !== 'Approved') {
    return res.status(400).json({ message: `Cannot assign technician from status "${existing.status}"` });
  }

  const { technicianId, technicianNotes, expectedCompletionDate } = req.body;
  if (!technicianId) return res.status(400).json({ message: 'Technician is required' });

  const request = await MaintenanceRequest.findByIdAndUpdate(
    req.params.id,
    {
      status: 'Technician Assigned',
      assignedTechnician: technicianId,
      technicianNotes: technicianNotes || '',
      expectedCompletionDate: expectedCompletionDate || null,
    },
    { new: true }
  )
    .populate('asset', 'assetId name status')
    .populate('requestedBy', 'name email role')
    .populate('approvedBy', 'name email role')
    .populate('assignedTechnician', 'name email role');

  await logActivity({ title: 'Technician assigned', detail: existing.title, type: 'maintenance', user: req.user._id });
  res.json(request);
});

// PATCH start (Technician Assigned → In Progress)
router.patch('/:id/start', protect, allowRoles('Admin', 'Asset Manager'), async (req, res) => {
  const existing = await MaintenanceRequest.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Request not found' });
  if (existing.status !== 'Technician Assigned') {
    return res.status(400).json({ message: `Cannot start from status "${existing.status}"` });
  }

  const request = await MaintenanceRequest.findByIdAndUpdate(
    req.params.id,
    { status: 'In Progress' },
    { new: true }
  )
    .populate('asset', 'assetId name status')
    .populate('requestedBy', 'name email role')
    .populate('approvedBy', 'name email role')
    .populate('assignedTechnician', 'name email role');

  await logActivity({ title: 'Maintenance started', detail: existing.title, type: 'maintenance', user: req.user._id });
  res.json(request);
});

// PATCH resolve (In Progress → Resolved)
router.patch('/:id/resolve', protect, allowRoles('Admin', 'Asset Manager'), async (req, res) => {
  const existing = await MaintenanceRequest.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Request not found' });
  if (existing.status !== 'In Progress') {
    return res.status(400).json({ message: `Cannot resolve from status "${existing.status}"` });
  }

  const { resolutionNote, finalCondition, resolvedAt } = req.body;

  const request = await MaintenanceRequest.findByIdAndUpdate(
    req.params.id,
    {
      status: 'Resolved',
      resolutionNote: resolutionNote || '',
      finalCondition: finalCondition || '',
      resolvedAt: resolvedAt ? new Date(resolvedAt) : new Date(),
    },
    { new: true }
  )
    .populate('asset', 'assetId name status')
    .populate('requestedBy', 'name email role')
    .populate('approvedBy', 'name email role')
    .populate('assignedTechnician', 'name email role');

  // Return asset to Available
  if (existing.asset) {
    await Asset.findByIdAndUpdate(existing.asset, {
      status: 'Available',
      ...(finalCondition ? { condition: finalCondition } : {}),
    });
  }

  await Notification.create({
    user: existing.requestedBy,
    title: 'Maintenance resolved',
    message: `${existing.title} has been resolved`,
    type: 'success',
    entityId: request._id.toString(),
  });

  await logActivity({ title: 'Maintenance resolved', detail: existing.title, type: 'maintenance', user: req.user._id });
  res.json(request);
});

export default router;