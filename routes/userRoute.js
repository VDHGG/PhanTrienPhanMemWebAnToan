const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const isLoggedIn = require('../middlewares/isLoggedIn');


router.get('/register', userController.showRegister);
router.post('/register', userController.registerUser);
router.get('/login', userController.showLogin);
router.post('/login', userController.loginUser);
router.get('/logout', userController.logout);
router.get('/profile/orders', isLoggedIn, userController.getOrders);
router.get('/profile/orders/:id', isLoggedIn, userController.getOrderDetail);
router.get('/wishlist', isLoggedIn, userController.getWishlist);
router.get('/wishlist/add/:id', isLoggedIn, userController.addToWishlist);
router.get('/wishlist/remove/:id', isLoggedIn, userController.removeFromWishlist);
router.get('/profile', isLoggedIn, userController.getProfile);
router.post('/profile', isLoggedIn, userController.updateProfile);

module.exports = router;
