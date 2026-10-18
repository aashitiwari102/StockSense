const mongoose = require('mongoose');

// Embedded sale line items — product details are snapshotted at time of sale
const saleItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: {
      type: String,
      required: true, // Snapshot — survives product deletion/rename
    },
    productSku: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price cannot be negative'],
    },
    subtotal: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    saleNumber: {
      type: String,
      unique: true,
    },
    items: {
      type: [saleItemSchema],
      required: true,
      validate: [arr => arr.length > 0, 'Sale must have at least one item'],
    },
    subtotal: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'bank_transfer', 'credit'],
      default: 'cash',
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'cancelled', 'refunded'],
      default: 'completed',
    },
    customerName: {
      type: String,
      trim: true,
    },
    customerPhone: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Auto-generate sale number before saving
saleSchema.pre('save', async function (next) {
  if (!this.saleNumber) {
    const count = await mongoose.model('Sale').countDocuments();
    this.saleNumber = `SS-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

saleSchema.index({ saleNumber: 1 }, { unique: true });
saleSchema.index({ createdAt: -1 });
saleSchema.index({ status: 1 });
saleSchema.index({ 'items.product': 1 });

module.exports = mongoose.model('Sale', saleSchema);
