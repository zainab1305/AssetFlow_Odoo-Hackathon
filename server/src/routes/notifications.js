import express from 'express';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(notifications);
});

router.patch('/:id/read', protect, async (req, res) => {
  const notification = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
  res.json(notification);
});

router.patch('/read-all', protect, async (req, res) => {
  await Notification.updateMany({ user: req.user._id }, { read: true });
  res.json({ message: 'All notifications marked read' });
});

export default router;