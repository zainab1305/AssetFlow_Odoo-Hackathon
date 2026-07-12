import express from 'express';
import Asset from '../models/Asset.js';
import Allocation from '../models/Allocation.js';
import Booking from '../models/Booking.js';
import MaintenanceRequest from '../models/MaintenanceRequest.js';
import Department from '../models/Department.js';
import { protect, allowRoles } from '../middleware/auth.js';

const router = express.Router();

router.get('/summary', protect, allowRoles('Admin', 'Asset Manager'), async (req, res) => {
  const [assets, allocations, bookings, maintenance, departments] = await Promise.all([
    Asset.find().populate('category', 'name'),
    Allocation.find().populate('asset', 'assetId name status').populate('allocatedTo', 'name'),
    Booking.find(),
    MaintenanceRequest.find(),
    Department.find(),
  ]);

  const utilization = assets.reduce(
    (acc, asset) => {
      acc.total += 1;
      if (asset.status === 'Allocated') acc.allocated += 1;
      if (asset.status === 'Available') acc.available += 1;
      return acc;
    },
    { total: 0, allocated: 0, available: 0 }
  );

  const departmentSummary = departments.map((department) => ({
    department: department.name,
    count: allocations.filter((allocation) => allocation.department?.toString() === department._id.toString()).length,
  }));

  const maintenanceStats = maintenance.reduce(
    (acc, item) => {
      acc[item.status.toLowerCase().replace(' ', '_')] += 1;
      return acc;
    },
    { pending: 0, approved: 0, in_progress: 0, resolved: 0, rejected: 0 }
  );

  res.json({
    utilization,
    departmentSummary,
    maintenanceStats,
    bookingCount: bookings.length,
  });
});

export default router;