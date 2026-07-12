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

router.get('/:assetId/history', protect, async (req, res) => {
  const asset = await Asset.findById(req.params.assetId).populate('history.by', 'name email role');
  if (!asset) return res.status(404).json({ message: 'Asset not found' });
  res.json(asset.history || []);
});

router.post('/', protect, allowRoles('Admin', 'Asset Manager', 'Department Head'), async (req, res) => {
  const { assetId, allocatedTo, department, type = 'Employee', remarks = '', expectedReturnDate } = req.body;
  const asset = await Asset.findById(assetId);
  if (!asset) return res.status(404).json({ message: 'Asset not found' });
  if (asset.status === 'Allocated') {
    const holder = asset.assignedTo ? await req.app.locals?.User?.findById?.(asset.assignedTo).select('name') : null;
    return res.status(409).json({ message: 'Asset currently held by another user', currentHolder: holder || null });
  }

  const allocation = await Allocation.create({
    asset: asset._id,
    allocatedTo,
    allocatedBy: req.user._id,
    department: department || null,
    type,
    remarks,
    expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
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

router.patch('/:id/return', protect, allowRoles('Admin', 'Asset Manager', 'Department Head'), async (req, res) => {
  const { condition = 'Good', notes = '' } = req.body;
  const allocation = await Allocation.findById(req.params.id).populate('asset');
  if (!allocation || allocation.status !== 'Active') {
    return res.status(400).json({ message: 'Allocation not active' });
  }

  allocation.status = 'Returned';
  allocation.returnedAt = new Date();
  allocation.conditionOnReturn = condition;
  allocation.checkInNotes = notes;
  await allocation.save();

  const asset = await Asset.findById(allocation.asset._id);
  asset.status = 'Available';
  asset.assignedTo = null;
  asset.history.unshift({ action: 'Returned', note: notes || 'Asset returned', by: req.user._id });
  await asset.save();

  await logActivity({ title: 'Asset returned', detail: `${asset.assetId} returned`, type: 'allocation', user: req.user._id });
  res.json(allocation);
});

router.post('/transfer-request', protect, allowRoles('Admin', 'Asset Manager', 'Department Head', 'Employee'), async (req, res) => {
  const { assetId, fromUser, toUser, note = '', reason = '', targetDepartment = '' } = req.body;
  const asset = await Asset.findById(assetId);
  if (!asset) return res.status(404).json({ message: 'Asset not found' });

  const request = await TransferRequest.create({
    asset: asset._id,
    requestedBy: req.user._id,
    fromUser,
    toUser,
    note: note || reason,
    reason,
    targetDepartment,
    status: 'Requested',
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
  const request = await TransferRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: 'Request not found' });

  request.status = 'Approved';
  request.decidedBy = req.user._id;
  request.decidedDate = new Date();
  await request.save();

  const existingAllocation = await Allocation.findOne({ asset: request.asset, status: 'Active' });
  if (existingAllocation) {
    existingAllocation.status = 'Returned';
    existingAllocation.returnedAt = new Date();
    await existingAllocation.save();
  }

  const allocation = await Allocation.create({
    asset: request.asset,
    allocatedTo: request.toUser,
    allocatedBy: req.user._id,
    status: 'Active',
    type: 'Employee',
  });

  const asset = await Asset.findById(request.asset);
  asset.status = 'Allocated';
  asset.assignedTo = request.toUser;
  asset.history.unshift({ action: 'Transfer approved', note: 'Transfer request approved', by: req.user._id });
  await asset.save();

  await Notification.create({
    user: request.toUser,
    title: 'Transfer approved',
    message: 'Your transfer request was approved',
    type: 'success',
    entityId: request.asset.toString(),
  });

  await logActivity({ title: 'Transfer approved', detail: `${asset.assetId} transferred`, type: 'allocation', user: req.user._id });
  res.json({ ...request.toObject(), allocation });
});

router.patch('/transfer-requests/:id/reject', protect, allowRoles('Admin', 'Asset Manager', 'Department Head'), async (req, res) => {
  const request = await TransferRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: 'Request not found' });
  request.status = 'Rejected';
  request.decidedBy = req.user._id;
  request.decidedDate = new Date();
  await request.save();
  await Notification.create({
    user: request.requestedBy,
    title: 'Transfer rejected',
    message: 'Your transfer request was rejected',
    type: 'warning',
    entityId: request.asset.toString(),
  });
  res.json(request);
});

export default router;