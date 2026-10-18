const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private
const getSales = async (req, res, next) => {
  try {
    const {
      status,
      paymentMethod,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [sales, total] = await Promise.all([
      Sale.find(query)
        .populate('createdBy', 'name email')
        .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Sale.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: sales,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single sale
// @route   GET /api/sales/:id
// @access  Private
const getSale = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('createdBy', 'name email')
      .lean();

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    res.json({ success: true, data: sale });
  } catch (error) {
    next(error);
  }
};

// @desc    Create sale — validates stock, deducts quantities, records movements
// @route   POST /api/sales
// @access  Private (admin, manager)
const createSale = async (req, res, next) => {
  const session = await mongoose.startSession();

  // Attempt with session (replica set), fall back to non-transactional if not supported
  let useTransaction = true;

  try {
    session.startTransaction();
  } catch (_) {
    useTransaction = false;
    await session.endSession();
  }

  try {
    const { items, discount = 0, tax = 0, paymentMethod, customerName, customerPhone, notes } = req.body;

    if (!items || items.length === 0) {
      if (useTransaction) await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Sale must include at least one item' });
    }

    // Validate and fetch all products
    const productIds = items.map(i => i.product);
    const products = useTransaction
      ? await Product.find({ _id: { $in: productIds }, isActive: true }).session(session)
      : await Product.find({ _id: { $in: productIds }, isActive: true });

    const productMap = Object.fromEntries(products.map(p => [p._id.toString(), p]));

    // Validate each item
    const saleItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = productMap[item.product];
      if (!product) {
        if (useTransaction) await session.abortTransaction();
        return res.status(404).json({ success: false, message: `Product not found: ${item.product}` });
      }

      if (product.quantity < item.quantity) {
        if (useTransaction) await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.quantity}, Requested: ${item.quantity}`,
        });
      }

      const unitPrice = item.unitPrice || product.sellingPrice;
      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;

      saleItems.push({
        product: product._id,
        productName: product.name,
        productSku: product.sku,
        quantity: item.quantity,
        unitPrice,
        subtotal: itemSubtotal,
      });
    }

    const totalAmount = subtotal - discount + tax;

    // Create the sale
    const saleData = {
      items: saleItems,
      subtotal,
      discount,
      tax,
      totalAmount,
      paymentMethod,
      customerName,
      customerPhone,
      notes,
      createdBy: req.user._id,
      status: 'completed',
    };

    let sale;
    if (useTransaction) {
      [sale] = await Sale.create([saleData], { session });
    } else {
      sale = await Sale.create(saleData);
    }

    // Deduct stock and record movements
    const movements = [];
    for (const item of saleItems) {
      const product = productMap[item.product.toString()];
      const quantityBefore = product.quantity;
      const quantityAfter = quantityBefore - item.quantity;

      if (useTransaction) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { quantity: -item.quantity } },
          { session }
        );
      } else {
        await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } });
      }

      movements.push({
        product: item.product,
        productName: item.productName,
        type: 'sale',
        quantityBefore,
        quantityChange: -item.quantity,
        quantityAfter,
        reference: sale.saleNumber,
        referenceId: sale._id,
        referenceModel: 'Sale',
        createdBy: req.user._id,
      });
    }

    if (useTransaction) {
      await StockMovement.insertMany(movements, { session });
      await session.commitTransaction();
    } else {
      await StockMovement.insertMany(movements);
    }

    // Emit real-time event via socket (attached to req.app)
    const io = req.app.get('io');
    if (io) {
      io.emit('saleCreated', { saleId: sale._id, saleNumber: sale.saleNumber, totalAmount });
      io.emit('stockUpdated', { items: saleItems.map(i => ({ productId: i.product, quantityChange: -i.quantity })) });
    }

    res.status(201).json({
      success: true,
      message: 'Sale recorded successfully',
      data: sale,
    });
  } catch (error) {
    if (useTransaction) {
      try { await session.abortTransaction(); } catch (_) {}
    }
    next(error);
  } finally {
    if (useTransaction) session.endSession();
  }
};

// @desc    Cancel/refund a sale and restore stock
// @route   PATCH /api/sales/:id/cancel
// @access  Private (admin)
const cancelSale = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }
    if (sale.status === 'cancelled' || sale.status === 'refunded') {
      return res.status(400).json({ success: false, message: 'Sale is already cancelled/refunded' });
    }

    sale.status = 'cancelled';
    await sale.save();

    // Restore stock
    const movements = [];
    for (const item of sale.items) {
      const product = await Product.findById(item.product);
      if (product) {
        const quantityBefore = product.quantity;
        await Product.findByIdAndUpdate(item.product, { $inc: { quantity: item.quantity } });
        movements.push({
          product: item.product,
          productName: item.productName,
          type: 'return',
          quantityBefore,
          quantityChange: item.quantity,
          quantityAfter: quantityBefore + item.quantity,
          reference: sale.saleNumber,
          referenceId: sale._id,
          referenceModel: 'Sale',
          notes: `Sale ${sale.saleNumber} cancelled`,
          createdBy: req.user._id,
        });
      }
    }

    await StockMovement.insertMany(movements);

    const io = req.app.get('io');
    if (io) io.emit('saleCancelled', { saleId: sale._id });

    res.json({ success: true, message: 'Sale cancelled and stock restored' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSales, getSale, createSale, cancelSale };
