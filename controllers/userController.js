const bcrypt = require('bcrypt');
const db = require('../config/db');

// Hiển thị trang đăng ký
exports.showRegister = (req, res) => {
  res.render('register', { errors: [], formData: {} });
};

// Xử lý đăng ký
exports.registerUser = async (req, res) => {
  const { username, password, fullname, email, phone, address } = req.body;

  if (!username || !password || !fullname || !email || !phone || !address) {
    return res.render('register', { errors: ['Vui lòng nhập đầy đủ thông tin!'], formData: req.body });
  }
  if (!email.endsWith('@gmail.com')) {
    return res.render('register', { errors: ['Email phải đuôi @gmail.com'], formData: req.body });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = `INSERT INTO users (username, password, fullname, email, phone, address, role) VALUES (?, ?, ?, ?, ?, ?, 'customer')`;
  db.query(sql, [username, hashedPassword, fullname, email, phone, address], (err) => {
    if (err) {
      console.error(err);
      return res.render('register', { errors: ['Lỗi: Tên người dùng hoặc email có thể đã tồn tại.'], formData: req.body });
    }
    res.redirect('/login');
  });
};

// Hiển thị trang đăng nhập
exports.showLogin = (req, res) => {
  res.render('login');
};

// Xử lý đăng nhập
exports.loginUser = (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT * FROM users WHERE username = ?';

  db.query(sql, [username], async (err, results) => {
    if (err) throw err;

    if (results.length === 0) {
      return res.send('Không tìm thấy tài khoản.');
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.send('Sai mật khẩu!');
    }

    req.session.user = {
      id: user.user_id,
      username: user.username,
      fullname: user.fullname,
      role: user.role
    };

    res.redirect('/');
  });
};

// Đăng xuất
exports.logout = (req, res) => {
  req.session.destroy();
  res.redirect('/');
};

// Order History (di chuyển từ checkoutController)
exports.getOrders = (req, res) => {
  const userId = req.session.user.id;
  const sql = `
    SELECT o.*, SUM(oi.quantity) AS item_count
    FROM orders o
    LEFT JOIN order_items oi ON o.order_id = oi.order_id
    WHERE o.user_id = ?
    GROUP BY o.order_id
    ORDER BY o.order_date DESC
  `;
  db.query(sql, [userId], (err, orders) => {
    if (err) throw err;
    res.render('profile/orders', { orders });
  });
};

exports.getOrderDetail = (req, res) => {
  const orderId = req.params.id;
  const userId = req.session.user.id;
  const orderSql = `SELECT * FROM orders WHERE order_id = ? AND user_id = ?`;
  const itemsSql = `SELECT oi.*, p.name, p.image FROM order_items oi LEFT JOIN products p ON oi.product_id = p.product_id WHERE oi.order_id = ?`;

  db.query(orderSql, [orderId, userId], (err, orders) => {
    if (err) throw err;
    if (orders.length === 0) return res.status(404).send('Không tìm thấy đơn hàng');
    db.query(itemsSql, [orderId], (err2, items) => {
      if (err2) throw err2;
      res.render('profile/order_detail', { order: orders[0], items });
    });
  });
};


// Wishlist
exports.getWishlist = (req, res) => {
  const userId = req.session.user.id;
  const sql = `
    SELECT p.* FROM wishlists w
    JOIN products p ON w.product_id = p.product_id
    WHERE w.user_id = ?
  `;
  db.query(sql, [userId], (err, products) => {
    if (err) throw err;
    res.render('wishlist', { products });
  });
};

exports.addToWishlist = (req, res) => {
  const userId = req.session.user.id;
  const productId = req.params.id;
  const checkSql = `SELECT * FROM wishlists WHERE user_id = ? AND product_id = ?`;
  db.query(checkSql, [userId, productId], (err, results) => {
    if (err) throw err;
    if (results.length > 0) return res.redirect('/wishlist'); // Already added
    const insertSql = `INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)`;
    db.query(insertSql, [userId, productId], (err2) => {
      if (err2) throw err2;
      res.redirect('/wishlist');
    });
  });
};

exports.removeFromWishlist = (req, res) => {
  const userId = req.session.user.id;
  const productId = req.params.id;
  const sql = `DELETE FROM wishlists WHERE user_id = ? AND product_id = ?`;
  db.query(sql, [userId, productId], (err) => {
    if (err) throw err;
    res.redirect('/wishlist');
  });
};


// Profile Edit
exports.getProfile = (req, res) => {
  const userId = req.session.user.id;
  const sql = 'SELECT fullname, email, phone, address FROM users WHERE user_id = ?';
  db.query(sql, [userId], (err, results) => {
    if (err) throw err;
    if (results.length === 0) return res.status(404).send('User not found');
    res.render('profile/edit', { user: results[0] });
  });
};

exports.updateProfile = async (req, res) => {
  const userId = req.session.user.id;
  const { fullname, email, phone, address, password } = req.body;

  let sql = 'UPDATE users SET fullname = ?, email = ?, phone = ?, address = ?';
  const params = [fullname, email, phone, address];

  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    sql += ', password = ?';
    params.push(hashedPassword);
  }

  sql += ' WHERE user_id = ?';
  params.push(userId);

  db.query(sql, params, (err) => {
    if (err) throw err;
    // Update session fullname
    req.session.user.fullname = fullname;
    res.redirect('/profile');
  });
};
