import express from 'express';
import MaintenanceRequest from '../models/MaintenanceRequest.js';
import Asset from '../models/Asset.js';
import Notification from '../models/Notification.js';
import { protect, allowRoles } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  const requests = await MaintenanceRequest.find()
    .populate('asset', 'assetId name status')
    .populate('requestedBy', 'name email role')
    .populate('approvedBy', 'name email role')
    .sort({ createdAt: -1 });
  res.json(requests);
});

router.post('/', protect, async (req, res) => {
  const { assetId, title, description, priority } = req.body;
  const request = await MaintenanceRequest.create({
    asset: assetId,
    requestedBy: req.user._id,
    title,
    description,
    priority,
  });

  await Asset.findByIdAndUpdate(assetId, { status: 'Under Maintenance' });
  await logActivity({ title: 'Maintenance requested', detail: title, type: 'maintenance', user: req.user._id });
  res.status(201).json(request);
});

router.patch('/:id/approve', protect, allowRoles('Admin', 'Asset Manager'), async (req, res) => {
  const request = await MaintenanceRequest.findByIdAndUpdate(
    req.params.id,
    { status: 'Approved', approvedBy: req.user._id },
    { new: true }
  ).populate('asset');

  if (!request) return res.status(404).json({ message: 'Request not found' });

  await Notification.create({
    user: request.requestedBy,
    title: 'Maintenance approved',
    message: `${request.title} has been approved`,
    type: 'success',
    entityId: request._id.toString(),
  });

  res.json(request);
});

router.patch('/:id/reject', protect, allowRoles('Admin', 'Asset Manager'), async (req, res) => {
  const request = await MaintenanceRequest.findByIdAndUpdate(
    req.params.id,
    { status: 'Rejected', approvedBy: req.user._id },
    { new: true }
  );
  res.json(request);
});

router.patch('/:id/start', protect, allowRoles('Admin', 'Asset Manager'), async (req, res) => {
  const request = await MaintenanceRequest.findByIdAndUpdate(req.params.id, { status: 'In Progress' }, { new: true }).populate('asset');
  res.json(request);
});

router.patch('/:id/resolve', protect, allowRoles('Admin', 'Asset Manager'), async (req, res) => {
  const request = await MaintenanceRequest.findByIdAndUpdate(
    req.params.id,
    { status: 'Resolved', resolutionNote: req.body.resolutionNote || '' },
    { new: true }
  ).populate('asset');

  if (request?.asset) {
    await Asset.findByIdAndUpdate(request.asset._id, { status: 'Available' });
  }

  res.json(request);
});

export default router;