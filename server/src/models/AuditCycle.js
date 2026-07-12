import mongoose from 'mongoose';

const auditItemSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    auditCycle: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditCycle', required: true },
    verificationStatus: { type: String, enum: ['Pending', 'Verified', 'Missing', 'Damaged'], default: 'Pending' },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedDate: { type: Date, default: null },
    remarks: { type: String, default: '' },
    evidencePhotoUrl: { type: String, default: '' },
    submitted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const auditCycleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    scopeType: { type: String, enum: ['Department', 'Location'], required: true },
    scopeValue: { type: String, required: true }, // Department ID or Location string
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    assignedAuditors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['InProgress', 'Closed'], default: 'InProgress' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    closedDate: { type: Date, default: null },
    includedAssetCount: { type: Number, default: 0 },
    excludedAssetCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Create separate models
const AuditItem = mongoose.model('AuditItem', auditItemSchema);
const AuditCycle = mongoose.model('AuditCycle', auditCycleSchema);

export { AuditCycle, AuditItem };
export default AuditCycle;