import express from 'express';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  const { sort = 'newest', search = '' } = req.query;
  const filter = { user: req.user._id };

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { message: { $regex: search, $options: 'i' } },
      { entityId: { $regex: search, $options: 'i' } },
      { assetTag: { $regex: search, $options: 'i' } },
    ];
  }

  const notifications = await Notification.find(filter).populate('triggeredBy', 'name email role employeeId').sort({ createdAt: sort === 'oldest' ? 1 : -1 });
  res.json(notifications);
});

router.get('/:id', protect, async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id }).populate('triggeredBy', 'name email role employeeId');

  if (!notification) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  res.json(notification);
});

router.patch('/:id/read', protect, async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true, readAt: new Date() },
    { new: true }
  ).populate('triggeredBy', 'name email role employeeId');
  res.json(notification);
});

router.patch('/read-all', protect, async (req, res) => {
  await Notification.updateMany({ user: req.user._id }, { read: true, readAt: new Date() });
  res.json({ message: 'All notifications marked read' });
});

export default router;