import express from 'express';
import { AuditCycle, AuditItem } from '../models/AuditCycle.js';
import Asset from '../models/Asset.js';
import Department from '../models/Department.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect, allowRoles } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = express.Router();

// Helper: Check if user can view audit cycle
const canViewCycle = (user, cycle) => {
  if (user.role === 'Admin' || user.role === 'Asset Manager') return true;
  if (user.role === 'Auditor') {
    return cycle.assignedAuditors.some((auditorId) => auditorId.toString() === user._id.toString());
  }
  return false;
};

// POST /api/audits - Create a new audit cycle
router.post('/', protect, allowRoles('Admin', 'Asset Manager'), async (req, res) => {
  try {
    const { name, scopeType, scopeValue, startDate, endDate, assignedAuditors } = req.body;

    // Validation: endDate >= startDate
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ message: 'End date must be after or equal to start date' });
    }

    // Validation: at least 1 auditor
    if (!assignedAuditors || assignedAuditors.length === 0) {
      return res.status(400).json({ message: 'At least one auditor must be assigned' });
    }

    // Validation: scopeType is exactly one of Department or Location with a value
    if (!['Department', 'Location'].includes(scopeType) || !scopeValue) {
      return res.status(400).json({ message: 'Scope type must be Department or Location with a value' });
    }

    // Find assets matching the scope
    let assetQuery = { status: 'Available' }; // Only audit available assets
    if (scopeType === 'Department') {
      assetQuery.department = scopeValue;
    } else if (scopeType === 'Location') {
      assetQuery.location = scopeValue;
    }

    const matchingAssets = await Asset.find(assetQuery);

    // Find assets already in an InProgress cycle (exclude them)
    const existingAuditItems = await AuditItem.find({
      verificationStatus: { $ne: 'Pending' }, // Only exclude if already processed
    })
      .populate('auditCycle', 'status')
      .lean();

    const inProgressAssetIds = existingAuditItems
      .filter((item) => item.auditCycle?.status === 'InProgress')
      .map((item) => item.asset.toString());

    const assetsToAudit = matchingAssets.filter((asset) => !inProgressAssetIds.includes(asset._id.toString()));
    const excludedCount = matchingAssets.length - assetsToAudit.length;

    // Create audit cycle
    const cycle = await AuditCycle.create({
      name,
      scopeType,
      scopeValue,
      startDate,
      endDate,
      assignedAuditors,
      createdBy: req.user._id,
      includedAssetCount: assetsToAudit.length,
      excludedAssetCount: excludedCount,
    });

    // Bulk create AuditItems
    const auditItems = assetsToAudit.map((asset) => ({
      asset: asset._id,
      auditCycle: cycle._id,
      verificationStatus: 'Pending',
    }));

    if (auditItems.length > 0) {
      await AuditItem.insertMany(auditItems);
    }

    // Notify assigned auditors
    for (const auditorId of assignedAuditors) {
      await Notification.create({
        user: auditorId,
        title: 'Audit cycle assigned',
        message: `You have been assigned to audit cycle "${name}"`,
        type: 'info',
        entityId: cycle._id.toString(),
      });
    }

    await logActivity({
      title: 'Audit cycle created',
      detail: `${name}: ${assetsToAudit.length} assets included, ${excludedCount} excluded`,
      type: 'audit',
      user: req.user._id,
    });

    const populatedCycle = await cycle.populate('assignedAuditors', 'name email');
    res.status(201).json({
      cycle: populatedCycle,
      includedCount: assetsToAudit.length,
      excludedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/audits - List audit cycles with role-based filtering
router.get('/', protect, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'Auditor') {
      // Auditors only see cycles they're assigned to and that are not closed
      query.assignedAuditors = req.user._id;
    }
    // Admin and Asset Manager see all cycles

    const cycles = await AuditCycle.find(query)
      .populate('assignedAuditors', 'name email')
      .populate('createdBy', 'name')
      .populate('closedBy', 'name')
      .sort({ createdAt: -1 });

    // For each cycle, calculate verification progress
    const cyclesWithProgress = await Promise.all(
      cycles.map(async (cycle) => {
        const items = await AuditItem.find({ auditCycle: cycle._id });
        const verifiedCount = items.filter((item) => item.verificationStatus !== 'Pending').length;
        const discrepancyCount = items.filter((item) => ['Missing', 'Damaged'].includes(item.verificationStatus)).length;

        return {
          ...cycle.toObject(),
          verificationProgress: `${verifiedCount}/${items.length}`,
          discrepancyCount,
        };
      })
    );

    res.json(cyclesWithProgress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/audits/:id - Get audit cycle detail
router.get('/:id', protect, async (req, res) => {
  try {
    const cycle = await AuditCycle.findById(req.params.id)
      .populate('assignedAuditors', 'name email')
      .populate('createdBy', 'name')
      .populate('closedBy', 'name');

    if (!cycle) return res.status(404).json({ message: 'Audit cycle not found' });

    // Check authorization
    if (!canViewCycle(req.user, cycle)) {
      return res.status(403).json({ message: 'You do not have access to this audit cycle' });
    }

    const items = await AuditItem.find({ auditCycle: cycle._id })
      .populate('asset', 'assetId name category location')
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ cycle, items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/audits/:itemId/verify - Submit asset verification
router.patch('/verify/:itemId', protect, async (req, res) => {
  try {
    const { verificationStatus, remarks, evidencePhotoUrl } = req.body;
    const item = await AuditItem.findById(req.params.itemId);

    if (!item) return res.status(404).json({ message: 'Audit item not found' });

    // Check if already submitted
    if (item.submitted) {
      return res.status(403).json({ message: 'This item has already been submitted and is read-only' });
    }

    // Get the parent cycle
    const cycle = await AuditCycle.findById(item.auditCycle);

    // Authorization: user must be an assigned auditor and cycle must be InProgress
    if (!cycle.assignedAuditors.some((auditorId) => auditorId.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'You are not assigned to this audit' });
    }

    if (cycle.status !== 'InProgress') {
      return res.status(400).json({ message: 'This audit cycle is closed' });
    }

    // Update the item
    item.verificationStatus = verificationStatus;
    item.remarks = remarks || '';
    item.evidencePhotoUrl = evidencePhotoUrl || '';
    item.verifiedBy = req.user._id;
    item.verifiedDate = new Date();
    item.submitted = true;

    await item.save();

    // Optionally log activity
    await logActivity({
      title: 'Asset verified',
      detail: `${verificationStatus} during audit`,
      type: 'audit',
      user: req.user._id,
    });

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/audits/:id/discrepancies - Get discrepancy report
router.get('/:id/discrepancies', protect, async (req, res) => {
  try {
    const cycle = await AuditCycle.findById(req.params.id);
    if (!cycle) return res.status(404).json({ message: 'Audit cycle not found' });

    if (!canViewCycle(req.user, cycle)) {
      return res.status(403).json({ message: 'You do not have access to this audit cycle' });
    }

    const discrepancies = await AuditItem.find({
      auditCycle: req.params.id,
      verificationStatus: { $in: ['Missing', 'Damaged'] },
    })
      .populate('asset', 'assetId name category location')
      .populate('verifiedBy', 'name');

    res.json(discrepancies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/audits/progress/summary - Get audit progress (Asset Manager only)
router.get('/progress/summary', protect, allowRoles('Admin', 'Asset Manager'), async (req, res) => {
  try {
    const inProgressCycles = await AuditCycle.find({ status: 'InProgress' })
      .populate('assignedAuditors', 'name')
      .sort({ createdAt: -1 });

    const progressData = await Promise.all(
      inProgressCycles.map(async (cycle) => {
        const items = await AuditItem.find({ auditCycle: cycle._id });
        const verifiedCount = items.filter((item) => item.verificationStatus !== 'Pending').length;
        const completionPercent = items.length > 0 ? Math.round((verifiedCount / items.length) * 100) : 0;

        const daysRemaining = Math.ceil((new Date(cycle.endDate) - new Date()) / (1000 * 60 * 60 * 24));
        const overdueCount = items.filter(
          (item) => item.verificationStatus === 'Pending' && new Date(cycle.endDate) < new Date()
        ).length;

        return {
          ...cycle.toObject(),
          completionPercent,
          daysRemaining,
          overdueCount,
        };
      })
    );

    res.json(progressData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/audits/:id/close - Close audit cycle
router.patch('/:id/close', protect, allowRoles('Admin', 'Asset Manager'), async (req, res) => {
  try {
    const cycle = await AuditCycle.findById(req.params.id);
    if (!cycle) return res.status(404).json({ message: 'Audit cycle not found' });

    // Check if all items are submitted (no pending)
    const pendingItems = await AuditItem.find({ auditCycle: req.params.id, verificationStatus: 'Pending' });

    if (pendingItems.length > 0) {
      return res.status(400).json({
        message: `Cannot close audit cycle. ${pendingItems.length} items are still pending verification.`,
        remainingCount: pendingItems.length,
      });
    }

    // Find Missing and Damaged items to update assets
    const missingItems = await AuditItem.find({ auditCycle: req.params.id, verificationStatus: 'Missing' });
    const damagedItems = await AuditItem.find({ auditCycle: req.params.id, verificationStatus: 'Damaged' });

    // Update asset statuses
    for (const item of missingItems) {
      await Asset.findByIdAndUpdate(item.asset, { status: 'Lost' });
    }

    for (const item of damagedItems) {
      await Asset.findByIdAndUpdate(item.asset, { status: 'Under Maintenance' });
    }

    // Close the cycle
    cycle.status = 'Closed';
    cycle.closedBy = req.user._id;
    cycle.closedDate = new Date();
    await cycle.save();

    // Notify assigned auditors
    for (const auditorId of cycle.assignedAuditors) {
      await Notification.create({
        user: auditorId,
        title: 'Audit cycle closed',
        message: `Audit cycle "${cycle.name}" has been closed`,
        type: 'success',
        entityId: cycle._id.toString(),
      });
    }

    await logActivity({
      title: 'Audit cycle closed',
      detail: `${cycle.name}: ${missingItems.length} missing, ${damagedItems.length} damaged`,
      type: 'audit',
      user: req.user._id,
    });

    res.json(cycle);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;