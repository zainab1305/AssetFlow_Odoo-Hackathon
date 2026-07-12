import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    detail: { type: String, default: '' },
    type: { type: String, enum: ['asset', 'allocation', 'maintenance', 'booking', 'audit', 'auth'], default: 'asset' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model('Activity', activitySchema);