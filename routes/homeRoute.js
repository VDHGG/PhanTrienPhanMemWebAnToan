const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Trang chủ
router.get('/', (req, res) => {
  const productSql = 'SELECT * FROM products ORDER BY RAND() LIMIT 20'; // Ngẫu nhiên 20
  const postSql = 'SELECT * FROM posts ORDER BY created_at DESC LIMIT 4';

  db.query(productSql, (err, products) => {
    if (err) throw err;

    db.query(postSql, (err, posts) => {
      if (err) throw err;

      // Default recommendations: random 4
      let recommendations = [];
      let recSql = 'SELECT * FROM products ORDER BY RAND() LIMIT 4';

      // Nếu cart có và có category_id, override gợi ý dựa cart
      if (req.session.cart && req.session.cart.length > 0) {
        const categoryIds = [...new Set(req.session.cart.map(item => item.category_id).filter(Boolean))];
        if (categoryIds.length > 0) {
          recSql = `SELECT * FROM products WHERE category_id IN (?) ORDER BY RAND() LIMIT 4`;
          db.query(recSql, [categoryIds], (err3, recResults) => {
            if (err3) console.error(err3); // Log lỗi nhưng không crash
            recommendations = recResults || []; // Default nếu query fail

            res.render('index', {
              products,
              posts,
              session: req.session,
              recommendations // Luôn truyền
            });
          });
          return; // Dừng để chờ query cart-based
        }
      }

      // Fallback random nếu no cart hoặc no category
      db.query(recSql, (err3, recResults) => {
        if (err3) console.error(err3);
        recommendations = recResults || [];
        res.render('index', {
          products,
          posts,
          session: req.session,
          recommendations
        });
      });
    });
  });
});

module.exports = router;
