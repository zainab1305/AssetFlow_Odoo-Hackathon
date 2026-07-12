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

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, default: 'file' }, // image, pdf, document
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
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
    acquisitionDate: { type: Date, default: null },
    acquisitionCost: { type: Number, default: 0 },
    condition: {
      type: String,
      enum: ['Excellent', 'Good', 'Fair', 'Damaged'],
      default: 'Good',
    },
    isBookable: { type: Boolean, default: false },
    imageUrl: { type: String, default: '' },
    documents: [documentSchema],
    notes: { type: String, default: '' },
    history: [assetHistorySchema],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Asset', assetSchema);