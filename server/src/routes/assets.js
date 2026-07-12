import express from 'express';
import Asset from '../models/Asset.js';
import Category from '../models/Category.js';
import Allocation from '../models/Allocation.js';
import MaintenanceRequest from '../models/MaintenanceRequest.js';
import { protect, allowRoles } from '../middleware/auth.js';
import { generateAssetId } from '../utils/assetId.js';
import { logActivity } from '../utils/activity.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  const { q = '', status = '', category = '', department = '', location = '', condition = '', sort = '-createdAt' } = req.query;
  const filter = { isDeleted: { $ne: true } };

  if (status) filter.status = status;
  if (category) filter.category = category;
  if (department) filter.department = department;
  if (condition) filter.condition = condition;
  if (location) filter.location = { $regex: location, $options: 'i' };
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { assetId: { $regex: q, $options: 'i' } },
      { serialNumber: { $regex: q, $options: 'i' } },
    ];
  }

  // Build sort object from query param like "name" or "-createdAt"
  const sortObj = {};
  if (sort.startsWith('-')) {
    sortObj[sort.substring(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  const assets = await Asset.find(filter)
    .populate('category', 'name type')
    .populate('department', 'name')
    .populate('assignedTo', 'name email role')
    .sort(sortObj);

  res.json(assets);
});

router.get('/meta/categories', protect, async (req, res) => {
  const categories = await Category.find().select('name type');
  res.json(categories);
});

router.get('/:id', protect, async (req, res) => {
  const asset = await Asset.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
    .populate('category')
    .populate('department', 'name')
    .populate('assignedTo', 'name email role')
    .populate('history.by', 'name email role');

  if (!asset) {
    return res.status(404).json({ message: 'Asset not found' });
  }

  const allocations = await Allocation.find({ asset: req.params.id }).populate('allocatedTo allocatedBy department', 'name email role');
  const maintenanceRecords = await MaintenanceRequest.find({ asset: req.params.id })
    .populate('requestedBy', 'name email')
    .populate('approvedBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({ ...asset.toObject(), allocations, maintenanceRecords });
});

router.post('/', protect, allowRoles('Admin', 'Asset Manager'), async (req, res) => {
  // Validate unique serial number if provided
  if (req.body.serialNumber && req.body.serialNumber.trim()) {
    const existing = await Asset.findOne({
      serialNumber: req.body.serialNumber.trim(),
      isDeleted: { $ne: true },
    });
    if (existing) {
      return res.status(409).json({ message: 'Serial number already exists', field: 'serialNumber' });
    }
  }

  const count = await Asset.countDocuments();
  const asset = await Asset.create({
    ...req.body,
    assetId: generateAssetId(count),
    history: [{ action: 'Created', note: 'Asset registered', by: req.user._id }],
  });
  await logActivity({ title: 'Asset registered', detail: `${asset.assetId} - ${asset.name}`, type: 'asset', user: req.user._id });
  res.status(201).json(asset);
});

router.put('/:id', protect, allowRoles('Admin', 'Asset Manager'), async (req, res) => {
  // Validate unique serial number on update if changed
  if (req.body.serialNumber && req.body.serialNumber.trim()) {
    const existing = await Asset.findOne({
      serialNumber: req.body.serialNumber.trim(),
      _id: { $ne: req.params.id },
      isDeleted: { $ne: true },
    });
    if (existing) {
      return res.status(409).json({ message: 'Serial number already exists', field: 'serialNumber' });
    }
  }

  const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true });
  await logActivity({ title: 'Asset updated', detail: `${asset.assetId} - ${asset.name}`, type: 'asset', user: req.user._id });
  res.json(asset);
});

router.post('/:id/history', protect, allowRoles('Admin', 'Asset Manager'), async (req, res) => {
  const { action, note } = req.body;
  const asset = await Asset.findById(req.params.id);
  asset.history.unshift({ action, note, by: req.user._id });
  await asset.save();
  res.json(asset);
});

router.delete('/:id', protect, allowRoles('Admin'), async (req, res) => {
  const asset = await Asset.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true, status: 'Disposed' },
    { new: true }
  );
  if (!asset) {
    return res.status(404).json({ message: 'Asset not found' });
  }
  asset.history.unshift({ action: 'Deleted', note: 'Asset soft-deleted', by: req.user._id });
  await asset.save();
  await logActivity({ title: 'Asset deleted', detail: `${asset.assetId} - ${asset.name}`, type: 'asset', user: req.user._id });
  res.json({ message: 'Asset removed' });
});

router.get('/:id/allocations', protect, async (req, res) => {
  const allocations = await Allocation.find({ asset: req.params.id }).populate('allocatedTo allocatedBy department', 'name email role');
  res.json(allocations);
});

export default router;