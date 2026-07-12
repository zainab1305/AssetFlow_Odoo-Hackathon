import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';
import Booking from './models/Booking.js';
import Notification from './models/Notification.js';

const PORT = process.env.PORT || 5000;

const startReminderJob = () => {
  const run = async () => {
    const reminderWindowStart = new Date(Date.now() + 15 * 60 * 1000);
    const reminderWindowEnd = new Date(Date.now() + 30 * 60 * 1000);
    const bookings = await Booking.find({
      status: { $ne: 'Cancelled' },
      reminderSent: false,
      startTime: { $gte: reminderWindowStart, $lte: reminderWindowEnd },
    }).populate('bookedBy', 'name email');

    for (const booking of bookings) {
      await Notification.create({
        user: booking.bookedBy._id,
        title: 'Upcoming booking reminder',
        message: `${booking.resourceName} starts at ${new Date(booking.startTime).toLocaleString()}`,
        type: 'warning',
        entityId: booking._id.toString(),
      });
      booking.reminderSent = true;
      await booking.save();
    }
  };

  run().catch((error) => console.error('Reminder job failed:', error.message));
  return setInterval(() => run().catch((error) => console.error('Reminder job failed:', error.message)), 5 * 60 * 1000);
};

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`AssetFlow API running on port ${PORT}`);
    });
    startReminderJob();
  } catch (error) {
    console.error('Server failed to start:', error.message);
    process.exit(1);
  }
};

start();