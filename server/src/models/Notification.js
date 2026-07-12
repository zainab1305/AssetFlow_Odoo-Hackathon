import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'success', 'warning', 'danger'], default: 'info' },
    category: { type: String, default: 'system_alert' },
    module: { type: String, default: '' },
    assetTag: { type: String, default: '' },
    triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    metadata: { type: Object, default: {} },
    entityId: { type: String, default: '' },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);