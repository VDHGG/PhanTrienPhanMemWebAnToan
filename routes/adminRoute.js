const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const isAdmin = require('../middlewares/isAdmin');

// Dashboard
router.get('/', isAdmin, adminController.dashboard);

// Products CRUD
router.get('/products', isAdmin, adminController.productsList);
router.get('/products/new', isAdmin, adminController.productNewForm);
router.post('/products/new', isAdmin, adminController.productCreate);
router.get('/products/:id/edit', isAdmin, adminController.productEditForm);
router.post('/products/:id/edit', isAdmin, adminController.productUpdate);
router.post('/products/:id/delete', isAdmin, adminController.productDelete);
router.post('/orders/:id/delete', isAdmin, adminController.orderDelete);

// Orders
router.get('/orders', isAdmin, adminController.ordersList);
router.get('/orders/:id', isAdmin, adminController.orderDetail);
router.post('/orders/:id/status', isAdmin, adminController.orderUpdateStatus);

// Users
router.get('/users', isAdmin, adminController.usersList);
router.post('/users/:id/role', isAdmin, adminController.userUpdateRole);
router.post('/users/:id/delete', isAdmin, adminController.userDelete);
router.get('/users/new', isAdmin, adminController.userNewForm);
router.post('/users/new', isAdmin, adminController.userCreate);

// Route mới cho demo SSRF
router.get('/fetch-image', isAdmin, adminController.fetchImageForm);
router.post('/fetch-image', isAdmin, adminController.fetchImage);

module.exports = router;
