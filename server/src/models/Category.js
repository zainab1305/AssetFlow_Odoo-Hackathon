import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    type: { type: String, enum: ['Asset', 'Resource'], default: 'Asset' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    customFields: {
      warrantyPeriodMonths: { type: Number, default: null },
      maintenanceCycleMonths: { type: Number, default: null },
      notes: { type: String, default: '' },
    },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
);

export default mongoose.model('Category', categorySchema);