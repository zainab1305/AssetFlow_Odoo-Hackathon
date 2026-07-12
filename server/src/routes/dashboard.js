import express from 'express';
import Asset from '../models/Asset.js';
import Allocation from '../models/Allocation.js';
import Booking from '../models/Booking.js';
import MaintenanceRequest from '../models/MaintenanceRequest.js';
import Activity from '../models/Activity.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/summary', protect, async (req, res) => {
  try {
    const [availableAssets, allocatedAssets, activeBookings, pendingMaintenance, recentActivities] = await Promise.all([
      Asset.countDocuments({ status: 'Available' }),
      Allocation.countDocuments({ status: 'Active' }),
      Booking.countDocuments({ status: { $in: ['Pending', 'Confirmed'] } }),
      MaintenanceRequest.countDocuments({ status: 'Pending' }),
      Activity.find().sort({ createdAt: -1 }).limit(6).populate('user', 'name role'),
    ]);

    res.json({
      kpis: {
        availableAssets,
        allocatedAssets,
        activeBookings,
        pendingMaintenance,
      },
      recentActivities,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;