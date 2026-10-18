const Product = require('../models/Product');
const Sale = require('../models/Sale');
const StockMovement = require('../models/StockMovement');
const Supplier = require('../models/Supplier');

// @desc    Dashboard KPI metrics
// @route   GET /api/analytics/dashboard
// @access  Private
const getDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      totalSuppliers,
      totalInventoryValue,
      currentMonthSales,
      lastMonthSales,
      totalSalesAllTime,
      recentSales,
      recentMovements,
      categoryBreakdown,
      dailySalesTrend,
      topProducts,
    ] = await Promise.all([
      // Product counts
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true, $expr: { $lte: ['$quantity', '$lowStockThreshold'] } }),

      // Supplier count
      Supplier.countDocuments({ isActive: true }),

      // Inventory value: sum(quantity * costPrice)
      Product.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, totalValue: { $sum: { $multiply: ['$quantity', '$costPrice'] } } } },
      ]),

      // This month's sales revenue
      Sale.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),

      // Last month's sales
      Sale.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),

      // All-time sales
      Sale.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),

      // Recent sales
      Sale.find({ status: 'completed' })
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // Recent stock movements
      StockMovement.find()
        .populate('product', 'name sku')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),

      // Inventory by category
      Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$category',
            totalProducts: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' },
            totalValue: { $sum: { $multiply: ['$quantity', '$costPrice'] } },
          },
        },
        { $sort: { totalValue: -1 } },
      ]),

      // Daily sales trend (last 30 days)
      Sale.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: last30Days } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            revenue: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),

      // Top 5 selling products this month
      Sale.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startOfMonth } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            productName: { $first: '$items.productName' },
            totalQuantitySold: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.subtotal' },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // Calculate month-over-month change
    const thisMonthRevenue = currentMonthSales[0]?.total || 0;
    const lastMonthRevenue = lastMonthSales[0]?.total || 0;
    const revenueChange =
      lastMonthRevenue > 0
        ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
        : thisMonthRevenue > 0
        ? 100
        : 0;

    res.json({
      success: true,
      data: {
        kpis: {
          totalProducts,
          activeProducts,
          lowStockProducts,
          totalSuppliers,
          inventoryValue: totalInventoryValue[0]?.totalValue || 0,
          thisMonthRevenue,
          thisMonthOrders: currentMonthSales[0]?.count || 0,
          lastMonthRevenue,
          revenueChange: parseFloat(revenueChange),
          allTimeRevenue: totalSalesAllTime[0]?.total || 0,
          allTimeOrders: totalSalesAllTime[0]?.count || 0,
        },
        recentSales,
        recentMovements,
        categoryBreakdown,
        dailySalesTrend: dailySalesTrend.map(d => ({
          date: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
          revenue: d.revenue,
          count: d.count,
        })),
        topProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Low stock products report
// @route   GET /api/analytics/low-stock
// @access  Private
const getLowStock = async (req, res, next) => {
  try {
    const products = await Product.find({
      isActive: true,
      $expr: { $lte: ['$quantity', '$lowStockThreshold'] },
    })
      .populate('supplier', 'name email phone')
      .sort({ quantity: 1 })
      .lean({ virtuals: true });

    res.json({ success: true, data: products, count: products.length });
  } catch (error) {
    next(error);
  }
};

// @desc    Inventory summary by category
// @route   GET /api/analytics/inventory-summary
// @access  Private
const getInventorySummary = async (req, res, next) => {
  try {
    const summary = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          productCount: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalCostValue: { $sum: { $multiply: ['$quantity', '$costPrice'] } },
          totalSellValue: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } },
          avgSellingPrice: { $avg: '$sellingPrice' },
          lowStockCount: {
            $sum: { $cond: [{ $lte: ['$quantity', '$lowStockThreshold'] }, 1, 0] },
          },
        },
      },
      { $sort: { totalCostValue: -1 } },
    ]);

    const totals = summary.reduce(
      (acc, cat) => ({
        productCount: acc.productCount + cat.productCount,
        totalQuantity: acc.totalQuantity + cat.totalQuantity,
        totalCostValue: acc.totalCostValue + cat.totalCostValue,
        totalSellValue: acc.totalSellValue + cat.totalSellValue,
        lowStockCount: acc.lowStockCount + cat.lowStockCount,
      }),
      { productCount: 0, totalQuantity: 0, totalCostValue: 0, totalSellValue: 0, lowStockCount: 0 }
    );

    res.json({ success: true, data: summary, totals });
  } catch (error) {
    next(error);
  }
};

// @desc    Sales analytics (flexible date range)
// @route   GET /api/analytics/sales
// @access  Private
const getSalesAnalytics = async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;
    const now = new Date();

    let startDate;
    if (period === '7d') startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
    else if (period === '30d') startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
    else if (period === '90d') startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
    else if (period === '1y') startDate = new Date(now - 365 * 24 * 60 * 60 * 1000);
    else startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [dailyTrend, byPaymentMethod, topProducts, salesByCategory] = await Promise.all([
      Sale.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            revenue: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),

      Sale.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startDate } } },
        { $group: { _id: '$paymentMethod', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),

      Sale.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startDate } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            productName: { $first: '$items.productName' },
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.subtotal' },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 },
      ]),

      Sale.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startDate } } },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.product',
            foreignField: '_id',
            as: 'productData',
          },
        },
        { $unwind: { path: '$productData', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$productData.category',
            totalRevenue: { $sum: '$items.subtotal' },
            totalQuantity: { $sum: '$items.quantity' },
          },
        },
        { $sort: { totalRevenue: -1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        period,
        dailyTrend: dailyTrend.map(d => ({
          date: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
          revenue: d.revenue,
          count: d.count,
        })),
        byPaymentMethod,
        topProducts,
        salesByCategory,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard, getLowStock, getInventorySummary, getSalesAnalytics };
