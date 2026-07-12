import express from 'express';
import Allocation from '../models/Allocation.js';
import Asset from '../models/Asset.js';
import TransferRequest from '../models/TransferRequest.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect, allowRoles } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = express.Router();

// Helper: check if user can view allocation based on role and department
const canViewAllocation = (user, allocation) => {
  if (user.role === 'Admin' || user.role === 'Asset Manager') return true;
  if (user.role === 'Department Head') {
    const allocation_dept = allocation.department?._id?.toString?.() || allocation.department?.toString?.();
    const user_dept = user.department?._id?.toString?.() || user.department?.toString?.();
    return allocation_dept === user_dept;
  }
  // Employee: only their own allocations
  const allocated_to = allocation.allocatedTo?._id?.toString?.() || allocation.allocatedTo?.toString?.();
  return allocated_to === user._id.toString();
};

router.get('/', protect, async (req, res) => {
  let query = {};

  // Filter by role and department scope
  if (req.user.role === 'Asset Manager' || req.user.role === 'Admin') {
    // Full access, no filtering needed
  } else if (req.user.role === 'Department Head') {
    // Only see allocations in their department
    query.department = req.user.department;
  } else {
    // Employee: only their own allocations
    query.allocatedTo = req.user._id;
  }

  const allocations = await Allocation.find(query)
    .populate('asset', 'assetId name status imageUrl')
    .populate('allocatedTo', 'name email role department')
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

router.post('/', protect, async (req, res) => {
  const { assetId, allocatedTo, department, type = 'Employee', remarks = '', expectedReturnDate } = req.body;

  // Permission check: only Asset Manager and Department Head can allocate
  if (!['Admin', 'Asset Manager', 'Department Head'].includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to allocate assets' });
  }

  // Department Head can only allocate within their department
  if (req.user.role === 'Department Head') {
    if (type === 'Department' && department !== req.user.department.toString()) {
      return res.status(403).json({ message: 'You can only allocate within your department' });
    }
    if (type === 'Employee') {
      const allocatee = await User.findById(allocatedTo);
      if (allocatee.department.toString() !== req.user.department.toString()) {
        return res.status(403).json({ message: 'You can only allocate assets to employees in your department' });
      }
    }
  }

  const asset = await Asset.findById(assetId);
  if (!asset) return res.status(404).json({ message: 'Asset not found' });
  if (asset.status === 'Allocated') {
    const holder = asset.assignedTo ? await User.findById(asset.assignedTo).select('name') : null;
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

  const allocatee = await User.findById(allocatedTo);
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

router.patch('/:id/return', protect, async (req, res) => {
  const { condition = 'Good', notes = '' } = req.body;
  const allocation = await Allocation.findById(req.params.id).populate('asset').populate('department');

  if (!allocation || allocation.status !== 'Active') {
    return res.status(400).json({ message: 'Allocation not active' });
  }

  // Permission check: Employee can only request, others can approve
  if (req.user.role === 'Employee') {
    // Employee must be the one holding the asset
    if (allocation.allocatedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only request return for your own allocations' });
    }
    // For employees, just log the request but don't complete the return yet
    allocation.returnRequestedBy = req.user._id;
    allocation.returnRequestedAt = new Date();
    allocation.returnCondition = condition;
    allocation.returnNotes = notes;
    await allocation.save();
    
    // Notify department head or asset manager
    const deptHead = await User.findOne({ department: allocation.department, role: 'Department Head' });
    const notifyUser = deptHead || (await User.findOne({ role: 'Asset Manager' }));
    if (notifyUser) {
      await Notification.create({
        user: notifyUser._id,
        title: 'Asset return requested',
        message: `${allocation.asset.assetId} return requested by ${req.user.name}`,
        type: 'info',
        entityId: allocation.asset._id.toString(),
      });
    }
    return res.json(allocation);
  }

  // Department Head can only approve returns for their department
  if (req.user.role === 'Department Head') {
    const allocation_dept = allocation.department?._id?.toString() || allocation.department?.toString();
    const user_dept = req.user.department?._id?.toString() || req.user.department?.toString();
    if (allocation_dept !== user_dept) {
      return res.status(403).json({ message: 'You can only approve returns for your department' });
    }
  }

  // Asset Manager can approve all returns
  if (!['Admin', 'Asset Manager', 'Department Head'].includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to approve returns' });
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
    status: 'Pending',
  });

  res.status(201).json(request);
});

router.get('/transfer-requests', protect, async (req, res) => {
  let query = {};

  if (req.user.role === 'Asset Manager' || req.user.role === 'Admin') {
    // Full access
  } else if (req.user.role === 'Department Head') {
    // See transfers from/to their department
    const deptHeadUsers = await User.find({ department: req.user.department, _id: { $ne: req.user._id } });
    const deptUserIds = deptHeadUsers.map(u => u._id);
    query.$or = [
      { fromUser: { $in: deptUserIds } },
      { toUser: { $in: deptUserIds } },
    ];
  } else if (req.user.role === 'Employee') {
    // Only see own transfer requests
    query.requestedBy = req.user._id;
  }

  const requests = await TransferRequest.find(query)
    .populate('asset', 'assetId name status')
    .populate('fromUser toUser requestedBy', 'name email role department')
    .sort({ createdAt: -1 });
  res.json(requests);
});

router.patch('/transfer-requests/:id/approve', protect, async (req, res) => {
  // Permission check: only Asset Manager and Department Head
  if (!['Admin', 'Asset Manager', 'Department Head'].includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to approve transfers' });
  }

  const request = await TransferRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: 'Request not found' });

  // Department Head can only approve transfers within their department
  if (req.user.role === 'Department Head') {
    const fromUserData = await User.findById(request.fromUser);
    const toUserData = await User.findById(request.toUser);
    const fromDept = fromUserData?.department?.toString() || '';
    const toDept = toUserData?.department?.toString() || '';
    const userDept = req.user.department?.toString() || '';
    if (fromDept !== userDept && toDept !== userDept) {
      return res.status(403).json({ message: 'You can only approve transfers within your department' });
    }
  }

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

  const toUserData = await User.findById(request.toUser);
  await Notification.create({
    user: request.toUser,
    title: 'Transfer approved',
    message: `Your transfer for ${asset.assetId} was approved`,
    type: 'success',
    entityId: request.asset.toString(),
  });

  await logActivity({ title: 'Transfer approved', detail: `${asset.assetId} transferred`, type: 'allocation', user: req.user._id });
  res.json({ ...request.toObject(), allocation });
});

router.patch('/transfer-requests/:id/reject', protect, async (req, res) => {
  // Permission check: only Asset Manager and Department Head
  if (!['Admin', 'Asset Manager', 'Department Head'].includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to reject transfers' });
  }

  const request = await TransferRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: 'Request not found' });

  // Department Head can only reject transfers within their department
  if (req.user.role === 'Department Head') {
    const fromUserData = await User.findById(request.fromUser);
    const toUserData = await User.findById(request.toUser);
    const fromDept = fromUserData?.department?.toString() || '';
    const toDept = toUserData?.department?.toString() || '';
    const userDept = req.user.department?.toString() || '';
    if (fromDept !== userDept && toDept !== userDept) {
      return res.status(403).json({ message: 'You can only reject transfers within your department' });
    }
  }

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

  await logActivity({ title: 'Transfer rejected', detail: 'Transfer request rejected', type: 'allocation', user: req.user._id });
  res.json(request);
});

export default router;