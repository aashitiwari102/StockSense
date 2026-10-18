const StockMovement = require('../models/StockMovement');

// @desc    Get stock movements with filtering
// @route   GET /api/stock-movements
// @access  Private
const getStockMovements = async (req, res, next) => {
  try {
    const {
      product,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 30,
    } = req.query;

    const query = {};
    if (product) query.product = product;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [movements, total] = await Promise.all([
      StockMovement.find(query)
        .populate('product', 'name sku')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      StockMovement.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: movements,
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

// @desc    Get movements for a specific product
// @route   GET /api/stock-movements/product/:productId
// @access  Private
const getProductMovements = async (req, res, next) => {
  try {
    const movements = await StockMovement.find({ product: req.params.productId })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ success: true, data: movements });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStockMovements, getProductMovements };
