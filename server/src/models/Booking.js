import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    resourceName: { type: String, required: true },
    resourceType: { type: String, enum: ['Meeting Room', 'Vehicle', 'Equipment'], required: true },
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    purpose: { type: String, default: '' },
    status: { type: String, enum: ['Pending', 'Confirmed', 'Cancelled'], default: 'Confirmed' },
  },
  { timestamps: true }
);

export default mongoose.model('Booking', bookingSchema);