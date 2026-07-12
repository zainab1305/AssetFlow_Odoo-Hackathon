import mongoose from 'mongoose';

const maintenanceSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedTechnician: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Technician Assigned', 'In Progress', 'Resolved', 'Rejected'],
      default: 'Pending',
    },
    technicianNotes: { type: String, default: '' },
    expectedCompletionDate: { type: Date, default: null },
    resolutionNote: { type: String, default: '' },
    finalCondition: {
      type: String,
      enum: ['Excellent', 'Good', 'Fair', 'Damaged', ''],
      default: '',
    },
    resolvedAt: { type: Date, default: null },
    documents: [
      {
        name: { type: String },
        url: { type: String },
        type: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('MaintenanceRequest', maintenanceSchema);