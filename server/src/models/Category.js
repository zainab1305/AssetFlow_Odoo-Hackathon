import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    type: { type: String, enum: ['Asset', 'Resource'], default: 'Asset' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
);

export default mongoose.model('Category', categorySchema);