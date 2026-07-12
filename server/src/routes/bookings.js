import express from 'express';
import Booking from '../models/Booking.js';
import Notification from '../models/Notification.js';
import { protect, allowRoles } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = express.Router();

const deriveBookingStatus = (booking, now = new Date()) => {
  if (booking.status === 'Cancelled') {
    return 'Cancelled';
  }

  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  if (now < start) return 'Upcoming';
  if (now >= start && now < end) return 'Ongoing';
  return 'Completed';
};

router.get('/', protect, async (req, res) => {
  const bookings = await Booking.find()
    .populate('bookedBy', 'name email role')
    .populate('department', 'name')
    .sort({ startTime: 1 });
  res.json(bookings.map((booking) => ({ ...booking.toObject(), status: deriveBookingStatus(booking) })));
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
    status: 'Upcoming',
  });

  await logActivity({ title: 'Resource booked', detail: `${resourceName} booked`, type: 'booking', user: req.user._id });
  await Notification.create({
    user: req.user._id,
    title: 'Booking confirmed',
    message: `${resourceName} booked from ${new Date(startTime).toLocaleString()} to ${new Date(endTime).toLocaleString()}`,
    type: 'success',
    entityId: booking._id.toString(),
  });
  res.status(201).json(booking);
});

router.patch('/:id/cancel', protect, async (req, res) => {
  const booking = await Booking.findByIdAndUpdate(req.params.id, { status: 'Cancelled' }, { new: true });
  res.json(booking);
});

router.patch('/:id/reschedule', protect, allowRoles('Admin', 'Asset Manager', 'Department Head', 'Employee'), async (req, res) => {
  const { startTime, endTime } = req.body;
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }

  const clash = await Booking.findOne({
    _id: { $ne: booking._id },
    resourceName: booking.resourceName,
    status: { $ne: 'Cancelled' },
    $or: [
      { startTime: { $lt: new Date(endTime) }, endTime: { $gt: new Date(startTime) } },
    ],
  });

  if (clash) {
    return res.status(400).json({ message: 'Booking overlaps with an existing reservation' });
  }

  booking.startTime = startTime;
  booking.endTime = endTime;
  booking.status = 'Upcoming';
  booking.reminderSent = false;
  await booking.save();

  await Notification.create({
    user: booking.bookedBy,
    title: 'Booking rescheduled',
    message: `${booking.resourceName} was rescheduled`,
    type: 'info',
    entityId: booking._id.toString(),
  });

  res.json(booking);
});

export default router;