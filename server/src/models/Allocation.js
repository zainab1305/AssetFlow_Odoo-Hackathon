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
    expectedReturnDate: { type: Date, default: null },
    returnedAt: { type: Date, default: null },
    remarks: { type: String, default: '' },
    conditionOnReturn: { type: String, enum: ['Good', 'Fair', 'Damaged'], default: null },
    checkInNotes: { type: String, default: '' },
    returnRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    returnRequestedAt: { type: Date, default: null },
    returnCondition: { type: String, enum: ['Good', 'Fair', 'Damaged'], default: null },
    returnNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Allocation', allocationSchema);