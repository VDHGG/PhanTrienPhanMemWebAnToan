const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');

router.get('/', checkoutController.showCheckout);
router.post('/', checkoutController.processCheckout);
router.get('/vnpay-return', checkoutController.vnpayReturn); // Return URL
router.get('/vnpay-ipn', checkoutController.vnpayIpn); // IPN URL (có thể dùng POST nếu VNPay yêu cầu)

module.exports = router;
