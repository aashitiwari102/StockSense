const express = require('express');
const router = express.Router();
const { getSales, getSale, createSale, cancelSale } = require('../controllers/saleController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getSales);
router.get('/:id', getSale);
router.post('/', authorize('admin', 'manager'), createSale);
router.patch('/:id/cancel', authorize('admin'), cancelSale);

module.exports = router;
