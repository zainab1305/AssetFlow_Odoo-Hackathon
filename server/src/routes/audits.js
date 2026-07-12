import express from 'express';
import AuditCycle from '../models/AuditCycle.js';
import Asset from '../models/Asset.js';
import { protect, allowRoles } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  const audits = await AuditCycle.find().populate('auditors', 'name email role').populate('department', 'name');
  res.json(audits);
});

router.post('/', protect, allowRoles('Admin', 'Asset Manager'), async (req, res) => {
  const audit = await AuditCycle.create(req.body);
  res.status(201).json(audit);
});

router.patch('/:id/items', protect, allowRoles('Admin', 'Asset Manager'), async (req, res) => {
  const { items } = req.body;
  const audit = await AuditCycle.findByIdAndUpdate(req.params.id, { items }, { new: true });
  const discrepancyCount = items.filter((item) => item.verificationStatus !== 'Verified').length;
  audit.discrepancyCount = discrepancyCount;
  audit.status = 'Completed';
  await audit.save();
  res.json(audit);
});

router.get('/:id/report', protect, async (req, res) => {
  const audit = await AuditCycle.findById(req.params.id).populate('items.asset', 'assetId name status location');
  const summary = audit.items.reduce(
    (acc, item) => {
      acc[item.verificationStatus.toLowerCase()] += 1;
      return acc;
    },
    { verified: 0, missing: 0, damaged: 0 }
  );
  res.json({ audit, summary });
});

router.get('/discrepancies/latest', protect, async (req, res) => {
  const latest = await AuditCycle.findOne().sort({ createdAt: -1 }).populate('items.asset', 'assetId name status location');
  res.json(latest);
});

export default router;