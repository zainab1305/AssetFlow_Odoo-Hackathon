import mongoose from 'mongoose';

const maintenanceSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'In Progress', 'Resolved', 'Rejected'],
      default: 'Pending',
    },
    resolutionNote: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('MaintenanceRequest', maintenanceSchema);