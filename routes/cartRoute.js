const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

router.post('/add', cartController.addToCart);
router.get('/', cartController.viewCart);
router.get('/remove/:id', cartController.removeItem);

module.exports = router;

