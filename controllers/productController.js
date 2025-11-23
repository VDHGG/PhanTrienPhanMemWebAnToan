const db = require('../config/db');

// ✅ Trang hiển thị toàn bộ sản phẩm + tìm kiếm + lọc
exports.getAllProducts = (req, res) => {
  const { search, price, discount, stock, gender, provider, page = 1 } = req.query;
  const limit = 20;
  const offset = (page - 1) * limit;

  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND name LIKE ?';
    params.push(`%${search}%`);
  }

  if (price === '<=500000') {
    sql += ' AND price <= 500000';
  } else if (price === '500000-1000000') {
    sql += ' AND price BETWEEN 500000 AND 1000000';
  } else if (price === '>=1000000') {
    sql += ' AND price >= 1000000';
  }

  if (discount === '<=10') {
    sql += ' AND discount <= 10';
  } else if (discount === '>=30') {
    sql += ' AND discount >= 30';
  } else if (discount === '>=50') {
    sql += ' AND discount >= 50';
  }

  if (stock === 'many') {
    sql += ' AND stock >= 20';
  } else if (stock === 'few') {
    sql += ' AND stock BETWEEN 1 AND 19';
  } else if (stock === 'none') {
    sql += ' AND stock = 0';
  }

  if (gender) {
    sql += ' AND gender = ?';
    params.push(gender);
  }

  if (provider) {
    sql += ' AND provider = ?';
    params.push(provider);
  }

  // Query count để tính totalPages
  const countSql = `SELECT COUNT(*) as total FROM products WHERE 1=1 ${sql.split('WHERE 1=1')[1] || ''}`;
  db.query(countSql, params, (err, countRes) => {
    if (err) throw err;
    const total = countRes[0].total;
    const totalPages = Math.ceil(total / limit);

    // Query products với LIMIT/OFFSET
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    db.query(sql, params, (err, products) => {
      if (err) throw err;

      // Get unique providers for filter
      db.query('SELECT DISTINCT provider FROM products', (err2, providersRes) => {
        if (err2) throw err2;
        const providers = providersRes.map(p => p.provider);

        res.render('products', {
          products,
          search: search || '',
          price: price || '',
          discount: discount || '',
          stock: stock || '',
          gender: gender || '',
          provider: provider || '',
          providers,
          page: parseInt(page),
          totalPages
        });
      });
    });
  });
};

// ✅ Trang chi tiết sản phẩm
exports.getProductById = (req, res) => {
  const id = req.params.id;
  const sql = 'SELECT * FROM products WHERE product_id = ?';
  db.query(sql, [id], (err, results) => {
    if (err) throw err;
    if (results.length > 0) {
      res.render('product_detail', { product: results[0] });
    } else {
      res.status(404).send('Sản phẩm không tồn tại');
    }
  });
};


// Helper để update avg rating
function updateAvgRating(productId) {
  const sql = `SELECT AVG(rating) AS avg FROM reviews WHERE product_id = ?`;
  db.query(sql, [productId], (err, result) => {
    if (err) throw err;
    const avg = result[0].avg || 0;
    db.query(`UPDATE products SET avg_rating = ? WHERE product_id = ?`, [avg.toFixed(2), productId]);
  });
}

// Submit review
exports.submitReview = (req, res) => {
  const { rating, comment } = req.body;
  const productId = req.params.id;
  const userId = req.session.user.id;

  // Check nếu user đã mua và delivered
  const checkSql = `
    SELECT oi.* FROM order_items oi
    JOIN orders o ON oi.order_id = o.order_id
    WHERE oi.product_id = ? AND o.user_id = ? AND o.status = 'Delivered'
  `;
  db.query(checkSql, [productId, userId], (err, results) => {
    if (err) throw err;
    if (results.length === 0) return res.send('Bạn chưa đủ điều kiện đánh giá sản phẩm này.');

    // Insert review
    const insertSql = `INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)`;
    db.query(insertSql, [productId, userId, rating, comment], (err2) => {
      if (err2) throw err2;
      updateAvgRating(productId);
      res.redirect(`/products/${productId}`);
    });
  });
};

exports.getProductById = (req, res) => {
  const id = req.params.id;

const productSql = 'SELECT p.*, c.category_name FROM products p LEFT JOIN categories c ON p.category_id = c.category_id WHERE p.product_id = ?';
  db.query(productSql, [id], (err, productResults) => {
    if (err) {
      console.error('Lỗi query product:', err);
      return res.status(500).send('Lỗi server');
    }
    if (productResults.length === 0) {
      return res.status(404).send('Sản phẩm không tồn tại');
    }

    const product = productResults[0];

    // Query reviews
    const reviewsSql = `
      SELECT r.*, u.fullname
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
    `;
    db.query(reviewsSql, [id], (err, reviews) => {
      if (err) console.error('Lỗi query reviews:', err);
      reviews = reviews || [];

      // Default
      let eligible = false;
      let recommendations = [];

      const finalRender = () => {
        console.log('>>> Render product_detail cho ID:', id); // Debug
        res.render('product_detail', {
          product,
          reviews,
          eligible,
          recommendations
        });
      };

      // Kiểm tra eligible (nếu đã login)
      if (req.session.user) {
        const eligibleSql = `
          SELECT 1
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.order_id
          WHERE oi.product_id = ?
            AND o.user_id = ?
            AND o.status = 'Delivered'
          LIMIT 1
        `;
        db.query(eligibleSql, [id, req.session.user.id], (err, eligibleRes) => {
          if (err) console.error('Lỗi eligible:', err);
          eligible = eligibleRes.length > 0;
          getRecommendations();
        });
      } else {
        getRecommendations();
      }

      // Query gợi ý
      function getRecommendations() {
        const recSql = `
          SELECT *
          FROM products
          WHERE category_id = ?
            AND product_id != ?
          ORDER BY RAND()
          LIMIT 4
        `;
        db.query(recSql, [product.category_id, id], (err, recRes) => {
          if (err) console.error('Lỗi recommendations:', err);
          recommendations = recRes || [];
          finalRender(); // CHẮC CHẮN GỌI RENDER Ở ĐÂY
        });
      }
    });
  });
};
