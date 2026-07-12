import mongoose from 'mongoose';

const allocationSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    allocatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    allocatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    type: { type: String, enum: ['Employee', 'Department'], default: 'Employee' },
    status: { type: String, enum: ['Active', 'Returned', 'Transferred'], default: 'Active' },
    allocatedAt: { type: Date, default: Date.now },
    returnedAt: { type: Date, default: null },
    remarks: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Allocation', allocationSchema);