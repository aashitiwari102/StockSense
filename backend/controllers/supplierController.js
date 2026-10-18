const Supplier = require('../models/Supplier');
const Product = require('../models/Product');

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private
const getSuppliers = async (req, res, next) => {
  try {
    const {
      search,
      isActive,
      sortBy = 'name',
      order = 'asc',
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};
    if (search) query.$text = { $search: search };
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [suppliers, total] = await Promise.all([
      Supplier.find(query)
        .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Supplier.countDocuments(query),
    ]);

    // Get product count per supplier
    const supplierIds = suppliers.map(s => s._id);
    const productCounts = await Product.aggregate([
      { $match: { supplier: { $in: supplierIds }, isActive: true } },
      { $group: { _id: '$supplier', count: { $sum: 1 } } },
    ]);

    const countMap = Object.fromEntries(productCounts.map(p => [p._id.toString(), p.count]));
    const enriched = suppliers.map(s => ({
      ...s,
      productCount: countMap[s._id.toString()] || 0,
    }));

    res.json({
      success: true,
      data: enriched,
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

// @desc    Get single supplier
// @route   GET /api/suppliers/:id
// @access  Private
const getSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id).lean();
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    // Get products from this supplier
    const products = await Product.find({ supplier: req.params.id, isActive: true })
      .select('name sku quantity sellingPrice')
      .lean();

    res.json({ success: true, data: { ...supplier, products } });
  } catch (error) {
    next(error);
  }
};

// @desc    Create supplier
// @route   POST /api/suppliers
// @access  Private (admin, manager)
const createSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Private (admin, manager)
const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    res.json({ success: true, message: 'Supplier updated successfully', data: supplier });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete supplier
// @route   DELETE /api/suppliers/:id
// @access  Private (admin)
const deleteSupplier = async (req, res, next) => {
  try {
    const hasProducts = await Product.exists({ supplier: req.params.id, isActive: true });
    if (hasProducts) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete supplier with active products. Reassign or deactivate products first.',
      });
    }

    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    res.json({ success: true, message: 'Supplier deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier };
