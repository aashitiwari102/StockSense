const Product = require('../models/Product');

// @desc    Get all products (with search, filter, sort, pagination)
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      supplier,
      lowStock,
      isActive,
      sortBy = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Filters
    if (category) query.category = { $regex: category, $options: 'i' };
    if (supplier) query.supplier = supplier;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    // Low stock filter (uses aggregation)
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$quantity', '$lowStockThreshold'] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('supplier', 'name email phone')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .lean({ virtuals: true }),
      Product.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: products,
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

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('supplier', 'name email phone address')
      .lean({ virtuals: true });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private (admin, manager)
const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    await product.populate('supplier', 'name email phone');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (admin, manager)
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('supplier', 'name email phone');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product (soft delete)
// @route   DELETE /api/products/:id
// @access  Private (admin)
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, message: 'Product deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get product categories (distinct)
// @route   GET /api/products/categories
// @access  Private
const getCategories = async (req, res, next) => {
  try {
    const categories = await Product.distinct('category', { isActive: true });
    res.json({ success: true, data: categories.sort() });
  } catch (error) {
    next(error);
  }
};

// @desc    Adjust stock manually
// @route   PATCH /api/products/:id/stock
// @access  Private (admin, manager)
const adjustStock = async (req, res, next) => {
  try {
    const { quantity, notes, type = 'adjustment' } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const quantityBefore = product.quantity;
    const newQuantity = quantityBefore + quantity;

    if (newQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${quantityBefore}`,
      });
    }

    product.quantity = newQuantity;
    await product.save();

    // Create stock movement record
    const StockMovement = require('../models/StockMovement');
    await StockMovement.create({
      product: product._id,
      productName: product.name,
      type,
      quantityBefore,
      quantityChange: quantity,
      quantityAfter: newQuantity,
      notes,
      createdBy: req.user._id,
    });

    res.json({
      success: true,
      message: 'Stock adjusted successfully',
      data: { quantityBefore, quantityChange: quantity, quantityAfter: newQuantity },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, getCategories, adjustStock };
