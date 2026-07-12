import mongoose from 'mongoose';

const auditItemSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    expectedLocation: { type: String, default: '' },
    verificationStatus: { type: String, enum: ['Verified', 'Missing', 'Damaged'], default: 'Verified' },
    remarks: { type: String, default: '' },
  },
  { _id: false }
);

const auditCycleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    auditors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    cycleDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['Draft', 'Open', 'Completed'], default: 'Open' },
    items: [auditItemSchema],
    discrepancyCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('AuditCycle', auditCycleSchema);