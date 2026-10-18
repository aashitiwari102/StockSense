const express = require('express');
const router = express.Router();
const { getStockMovements, getProductMovements } = require('../controllers/stockMovementController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getStockMovements);
router.get('/product/:productId', getProductMovements);

module.exports = router;
