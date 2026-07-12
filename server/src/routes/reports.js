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
    Asset.find().populate('category', 'name customFields'),
    Allocation.find().populate('asset', 'assetId name status category').populate('allocatedTo', 'name').populate('department', 'name'),
    Booking.find(),
    MaintenanceRequest.find().populate({ path: 'asset', select: 'assetId name category', populate: { path: 'category', select: 'name' } }),
    Department.find(),
  ]);

  const now = new Date();
  const dayMs = 1000 * 60 * 60 * 24;
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleString('en', { month: 'short' }),
      count: 0,
    };
  });

  const utilization = assets.reduce(
    (acc, asset) => {
      acc.total += 1;
      if (asset.status === 'Allocated') acc.allocated += 1;
      if (asset.status === 'Available') acc.available += 1;
      return acc;
    },
    { total: 0, allocated: 0, available: 0 }
  );

  const activeAllocations = allocations.filter((allocation) => allocation.status === 'Active');
  const departmentSummary = departments.map((department) => ({
    department: department.name,
    count: activeAllocations.filter((allocation) => {
      const allocationDepartment = allocation.department?._id?.toString?.() || allocation.department?.toString?.();
      return allocationDepartment === department._id.toString();
    }).length,
    totalAssets: assets.filter((asset) => asset.department?.toString() === department._id.toString()).length,
  }));

  const maintenanceStats = maintenance.reduce(
    (acc, item) => {
      const key = item.status.toLowerCase().replaceAll(' ', '_');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    { pending: 0, approved: 0, technician_assigned: 0, in_progress: 0, resolved: 0, rejected: 0 }
  );

  const assetUseCounts = new Map();
  allocations.forEach((allocation) => {
    const asset = allocation.asset;
    if (!asset?._id) return;
    const existing = assetUseCounts.get(asset._id.toString()) || { assetId: asset.assetId, name: asset.name, count: 0 };
    existing.count += 1;
    assetUseCounts.set(asset._id.toString(), existing);
  });
  bookings.forEach((booking) => {
    const key = booking.resourceName;
    const existing = assetUseCounts.get(key) || { assetId: booking.resourceType, name: booking.resourceName, count: 0 };
    existing.count += 1;
    assetUseCounts.set(key, existing);
  });

  const mostUsedAssets = Array.from(assetUseCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const idleAssets = assets
    .filter((asset) => asset.status === 'Available')
    .map((asset) => {
      const lastUse = [...allocations]
        .filter((allocation) => allocation.asset?._id?.toString() === asset._id.toString())
        .map((allocation) => allocation.returnedAt || allocation.allocatedAt || allocation.createdAt)
        .filter(Boolean)
        .sort((a, b) => new Date(b) - new Date(a))[0];
      const idleSince = lastUse || asset.createdAt;
      return {
        assetId: asset.assetId,
        name: asset.name,
        idleDays: Math.max(0, Math.floor((now - new Date(idleSince)) / dayMs)),
      };
    })
    .sort((a, b) => b.idleDays - a.idleDays)
    .slice(0, 4);

  const maintenanceByCategory = maintenance.reduce((acc, request) => {
    const category = request.asset?.category?.name || 'Uncategorized';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});
  const maintenanceFrequency = Object.entries(maintenanceByCategory)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const maintenanceTrend = maintenance.reduce(
    (acc, request) => {
      const date = new Date(request.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const month = acc.find((item) => item.key === key);
      if (month) month.count += 1;
      return acc;
    },
    months.map((month) => ({ ...month }))
  );

  const attentionAssets = assets
    .map((asset) => {
      const latestMaintenance = maintenance
        .filter((request) => request.asset?._id?.toString() === asset._id.toString())
        .sort((a, b) => new Date(b.resolvedAt || b.createdAt) - new Date(a.resolvedAt || a.createdAt))[0];
      const maintenanceCycleMonths = asset.category?.customFields?.maintenanceCycleMonths || 6;
      const baseDate = latestMaintenance?.resolvedAt || latestMaintenance?.createdAt || asset.acquisitionDate || asset.purchaseDate || asset.createdAt;
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + maintenanceCycleMonths);
      const daysUntilDue = Math.ceil((dueDate - now) / dayMs);
      const ageYears = asset.purchaseDate || asset.acquisitionDate ? (now - new Date(asset.purchaseDate || asset.acquisitionDate)) / (dayMs * 365) : 0;

      if (asset.status === 'Retired' || asset.status === 'Disposed') return null;
      if (daysUntilDue <= 30) {
        return {
          assetId: asset.assetId,
          name: asset.name,
          reason: daysUntilDue < 0 ? `service overdue by ${Math.abs(daysUntilDue)} days` : `service due in ${daysUntilDue} days`,
          priority: daysUntilDue < 0 ? 2 : 1,
        };
      }
      if (ageYears >= 4) {
        return {
          assetId: asset.assetId,
          name: asset.name,
          reason: `${Math.floor(ageYears)} years old, nearing retirement`,
          priority: 0,
        };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);

  const heatmapHours = [
    { label: '8-10', count: 0 },
    { label: '10-12', count: 0 },
    { label: '12-2', count: 0 },
    { label: '2-4', count: 0 },
    { label: '4-6', count: 0 },
  ];
  bookings.forEach((booking) => {
    const hour = new Date(booking.startTime).getHours();
    const bucket = hour < 10 ? 0 : hour < 12 ? 1 : hour < 14 ? 2 : hour < 16 ? 3 : 4;
    heatmapHours[bucket].count += 1;
  });

  res.json({
    utilization,
    departmentSummary,
    maintenanceStats,
    maintenanceFrequency,
    maintenanceTrend,
    mostUsedAssets,
    idleAssets,
    attentionAssets,
    bookingHeatmap: heatmapHours,
    bookingCount: bookings.length,
  });
});

export default router;
