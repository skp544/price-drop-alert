const express = require('express');
const { body } = require('express-validator');
const {
  addProduct,
  getProducts,
  getProductById,
  updateTargetPrice,
  deleteProduct,
  checkNow,
  getPriceHistory,
} = require('../controllers/productController');

const router = express.Router();

router.post(
  '/',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('url').isURL().withMessage('Valid URL required'),
    body('targetPrice')
      .isFloat({ min: 0.01 })
      .withMessage('Target price must be a positive number'),
  ],
  addProduct
);

router.get('/', getProducts);
router.get('/:id', getProductById);
router.get('/:id/history', getPriceHistory);
router.put('/:id/target', updateTargetPrice);
router.post('/:id/check', checkNow);
router.delete('/:id', deleteProduct);

module.exports = router;
