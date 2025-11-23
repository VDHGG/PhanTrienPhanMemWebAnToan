const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const isLoggedIn = require('../middlewares/isLoggedIn');

// Danh sách tất cả sản phẩm
router.get('/', productController.getAllProducts);

// Chi tiết sản phẩm theo ID
router.get('/:id', productController.getProductById);
// Review
router.post('/:id/review', isLoggedIn, productController.submitReview);

module.exports = router;
