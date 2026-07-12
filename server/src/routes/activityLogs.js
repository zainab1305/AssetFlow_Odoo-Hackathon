import express from 'express';
import Activity from '../models/Activity.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  const { search = '' } = req.query;
  const filter = {};

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { detail: { $regex: search, $options: 'i' } },
      { type: { $regex: search, $options: 'i' } },
    ];
  }

  const activities = await Activity.find(filter).populate('user', 'name role email employeeId').sort({ createdAt: -1 }).limit(25);

  res.json(
    activities.map((activity) => ({
      id: activity._id.toString(),
      user: activity.user?.name || 'System',
      action: activity.title,
      module: activity.type,
      timestamp: activity.createdAt,
      description: activity.detail,
      metadata: activity.meta || {},
    }))
  );
});

export default router;