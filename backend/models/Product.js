const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    unit: {
      type: String,
      enum: ['piece', 'kg', 'liter', 'box', 'pack', 'meter', 'unit'],
      default: 'piece',
    },
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: 0,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    tags: [String],
    imageUrl: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    location: {
      type: String, // warehouse/shelf location
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: is this product low on stock?
productSchema.virtual('isLowStock').get(function () {
  return this.quantity <= this.lowStockThreshold;
});

// Virtual: profit margin
productSchema.virtual('margin').get(function () {
  if (!this.sellingPrice || !this.costPrice) return 0;
  return (((this.sellingPrice - this.costPrice) / this.sellingPrice) * 100).toFixed(2);
});

// Compound text index for search
productSchema.index({ name: 'text', description: 'text', sku: 'text', category: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ supplier: 1 });
productSchema.index({ quantity: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ sku: 1 }, { unique: true });

module.exports = mongoose.model('Product', productSchema);
