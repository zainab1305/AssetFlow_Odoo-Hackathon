import express from 'express';
import Allocation from '../models/Allocation.js';
import Asset from '../models/Asset.js';
import TransferRequest from '../models/TransferRequest.js';
import Notification from '../models/Notification.js';
import { protect, allowRoles } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  const allocations = await Allocation.find()
    .populate('asset', 'assetId name status imageUrl')
    .populate('allocatedTo', 'name email role')
    .populate('allocatedBy', 'name email role')
    .populate('department', 'name')
    .sort({ createdAt: -1 });
  res.json(allocations);
});

router.post('/', protect, allowRoles('Admin', 'Asset Manager', 'Department Head'), async (req, res) => {
  const { assetId, allocatedTo, department, type = 'Employee', remarks = '' } = req.body;
  const asset = await Asset.findById(assetId);
  if (!asset) return res.status(404).json({ message: 'Asset not found' });
  if (asset.status === 'Allocated') {
    return res.status(400).json({ message: 'Asset already allocated' });
  }

  const allocation = await Allocation.create({
    asset: asset._id,
    allocatedTo,
    allocatedBy: req.user._id,
    department: department || null,
    type,
    remarks,
  });

  asset.status = 'Allocated';
  asset.assignedTo = allocatedTo;
  asset.department = department || null;
  asset.history.unshift({ action: 'Allocated', note: remarks || 'Asset allocated', by: req.user._id });
  await asset.save();

  await Notification.create({
    user: allocatedTo,
    title: 'Asset allocated',
    message: `${asset.assetId} has been assigned to you`,
    type: 'success',
    entityId: asset._id.toString(),
  });

  await logActivity({ title: 'Asset allocated', detail: `${asset.assetId} assigned`, type: 'allocation', user: req.user._id });
  res.status(201).json(allocation);
});

router.post('/:id/return', protect, allowRoles('Admin', 'Asset Manager', 'Department Head'), async (req, res) => {
  const allocation = await Allocation.findById(req.params.id).populate('asset');
  if (!allocation || allocation.status !== 'Active') {
    return res.status(400).json({ message: 'Allocation not active' });
  }

  allocation.status = 'Returned';
  allocation.returnedAt = new Date();
  await allocation.save();

  const asset = await Asset.findById(allocation.asset._id);
  asset.status = 'Available';
  asset.assignedTo = null;
  asset.history.unshift({ action: 'Returned', note: 'Asset returned', by: req.user._id });
  await asset.save();

  await logActivity({ title: 'Asset returned', detail: `${asset.assetId} returned`, type: 'allocation', user: req.user._id });
  res.json(allocation);
});

router.post('/transfer-request', protect, allowRoles('Admin', 'Asset Manager', 'Department Head', 'Employee'), async (req, res) => {
  const { assetId, fromUser, toUser, note = '' } = req.body;
  const asset = await Asset.findById(assetId);
  if (!asset) return res.status(404).json({ message: 'Asset not found' });

  const request = await TransferRequest.create({
    asset: asset._id,
    requestedBy: req.user._id,
    fromUser,
    toUser,
    note,
  });

  res.status(201).json(request);
});

router.get('/transfer-requests', protect, async (req, res) => {
  const requests = await TransferRequest.find()
    .populate('asset', 'assetId name status')
    .populate('fromUser toUser requestedBy', 'name email role');
  res.json(requests);
});

router.patch('/transfer-requests/:id/approve', protect, allowRoles('Admin', 'Asset Manager', 'Department Head'), async (req, res) => {
  const request = await TransferRequest.findByIdAndUpdate(req.params.id, { status: 'Approved' }, { new: true });
  if (!request) return res.status(404).json({ message: 'Request not found' });

  await Asset.findByIdAndUpdate(request.asset, { assignedTo: request.toUser });
  await Notification.create({
    user: request.toUser,
    title: 'Transfer approved',
    message: 'Your transfer request was approved',
    type: 'success',
    entityId: request.asset.toString(),
  });

  res.json(request);
});

router.patch('/transfer-requests/:id/reject', protect, allowRoles('Admin', 'Asset Manager', 'Department Head'), async (req, res) => {
  const request = await TransferRequest.findByIdAndUpdate(req.params.id, { status: 'Rejected' }, { new: true });
  res.json(request);
});

export default router;