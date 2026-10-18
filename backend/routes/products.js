const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  adjustStock,
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.get('/categories', getCategories);
router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/', authorize('admin', 'manager'), createProduct);
router.put('/:id', authorize('admin', 'manager'), updateProduct);
router.delete('/:id', authorize('admin'), deleteProduct);
router.patch('/:id/stock', authorize('admin', 'manager'), adjustStock);

module.exports = router;
