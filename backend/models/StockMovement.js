const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: {
      type: String,
      required: true, // Snapshot
    },
    type: {
      type: String,
      required: true,
      enum: ['sale', 'restock', 'adjustment', 'return', 'damaged', 'transfer'],
    },
    quantityBefore: {
      type: Number,
      required: true,
    },
    quantityChange: {
      type: Number,
      required: true, // Positive = inflow, Negative = outflow
    },
    quantityAfter: {
      type: Number,
      required: true,
    },
    reference: {
      type: String, // Sale number, PO number, etc.
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId, // Link to Sale or other doc
      refPath: 'referenceModel',
    },
    referenceModel: {
      type: String,
      enum: ['Sale'],
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

stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ type: 1 });
stockMovementSchema.index({ createdAt: -1 });
stockMovementSchema.index({ reference: 1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
