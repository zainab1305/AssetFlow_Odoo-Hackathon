import express from 'express';
import Asset from '../models/Asset.js';
import Category from '../models/Category.js';
import Allocation from '../models/Allocation.js';
import { protect, allowRoles } from '../middleware/auth.js';
import { generateAssetId } from '../utils/assetId.js';
import { logActivity } from '../utils/activity.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  const { q = '', status = '', category = '' } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { assetId: { $regex: q, $options: 'i' } },
      { serialNumber: { $regex: q, $options: 'i' } },
    ];
  }

  const assets = await Asset.find(filter)
    .populate('category', 'name type')
    .populate('department', 'name')
    .populate('assignedTo', 'name email role')
    .sort({ createdAt: -1 });

  res.json(assets);
});

router.get('/meta/categories', protect, async (req, res) => {
  const categories = await Category.find().select('name type');
  res.json(categories);
});

router.get('/:id', protect, async (req, res) => {
  const asset = await Asset.findById(req.params.id)
    .populate('category')
    .populate('department', 'name')
    .populate('assignedTo', 'name email role')
    .populate('history.by', 'name email role');
  const allocations = await Allocation.find({ asset: req.params.id }).populate('allocatedTo allocatedBy department', 'name email role');
  res.json({ ...asset.toObject(), allocations });
});

router.post('/', protect, allowRoles('Admin', 'Asset Manager'), async (req, res) => {
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
  await Asset.findByIdAndDelete(req.params.id);
  res.json({ message: 'Asset removed' });
});

router.get('/:id/allocations', protect, async (req, res) => {
  const allocations = await Allocation.find({ asset: req.params.id }).populate('allocatedTo allocatedBy department', 'name email role');
  res.json(allocations);
});

export default router;