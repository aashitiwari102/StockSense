const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getLowStock,
  getInventorySummary,
  getSalesAnalytics,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/dashboard', getDashboard);
router.get('/low-stock', getLowStock);
router.get('/inventory-summary', getInventorySummary);
router.get('/sales', getSalesAnalytics);

module.exports = router;
