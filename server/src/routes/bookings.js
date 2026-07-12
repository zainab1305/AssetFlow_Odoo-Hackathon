import express from 'express';
import Booking from '../models/Booking.js';
import { protect, allowRoles } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  const bookings = await Booking.find()
    .populate('bookedBy', 'name email role')
    .populate('department', 'name')
    .sort({ startTime: 1 });
  res.json(bookings);
});

router.post('/', protect, allowRoles('Admin', 'Asset Manager', 'Department Head', 'Employee'), async (req, res) => {
  const { resourceName, resourceType, startTime, endTime, purpose, department } = req.body;
  const clash = await Booking.findOne({
    resourceName,
    status: { $ne: 'Cancelled' },
    $or: [
      { startTime: { $lt: new Date(endTime) }, endTime: { $gt: new Date(startTime) } },
    ],
  });

  if (clash) {
    return res.status(400).json({ message: 'Booking overlaps with an existing reservation' });
  }

  const booking = await Booking.create({
    resourceName,
    resourceType,
    bookedBy: req.user._id,
    department: department || null,
    startTime,
    endTime,
    purpose,
    status: 'Confirmed',
  });

  await logActivity({ title: 'Resource booked', detail: `${resourceName} booked`, type: 'booking', user: req.user._id });
  res.status(201).json(booking);
});

router.patch('/:id/cancel', protect, async (req, res) => {
  const booking = await Booking.findByIdAndUpdate(req.params.id, { status: 'Cancelled' }, { new: true });
  res.json(booking);
});

export default router;