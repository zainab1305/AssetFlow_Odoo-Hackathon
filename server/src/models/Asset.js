import mongoose from 'mongoose';

const assetHistorySchema = new mongoose.Schema(
  {
    action: String,
    note: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const assetSchema = new mongoose.Schema(
  {
    assetId: { type: String, unique: true },
    name: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    location: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Available', 'Allocated', 'Reserved', 'Under Maintenance', 'Lost', 'Retired', 'Disposed'],
      default: 'Available',
    },
    serialNumber: { type: String, default: '' },
    purchaseDate: { type: Date, default: null },
    imageUrl: { type: String, default: '' },
    notes: { type: String, default: '' },
    history: [assetHistorySchema],
  },
  { timestamps: true }
);

export default mongoose.model('Asset', assetSchema);