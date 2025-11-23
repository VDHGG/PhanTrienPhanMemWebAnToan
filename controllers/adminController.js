const db = require('../config/db');
const bcrypt = require('bcrypt');
const fetch = require('node-fetch');
const ssrfFilter = require('ssrf-req-filter');

// Dashboard: số liệu tóm tắt
exports.dashboard = (req, res) => {
  const statsSql = `
    SELECT
      (SELECT COUNT(*) FROM products) AS productCount,
      (SELECT COUNT(*) FROM orders) AS orderCount,
      (SELECT COUNT(*) FROM users) AS userCount
  `;
  db.query(statsSql, (err, results) => {
    if (err) throw err;
    const stats = results[0];
    res.render('admin/dashboard', { stats });
  });
};

// Products list (thêm search và filter)
exports.productsList = (req, res) => {
  const { search, price, discount, stock, gender, provider, page = 1 } = req.query;
  const limit = 20;
  const offset = (page - 1) * limit;

  let sql = 'SELECT p.*, c.category_name FROM products p LEFT JOIN categories c ON p.category_id = c.category_id WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND p.name LIKE ?';
    params.push(`%${search}%`);
  }

  if (price === '<=500000') {
    sql += ' AND p.price <= 500000';
  } else if (price === '500000-1000000') {
    sql += ' AND p.price BETWEEN 500000 AND 1000000';
  } else if (price === '>=1000000') {
    sql += ' AND p.price >= 1000000';
  }

  if (discount === '<=10') {
    sql += ' AND p.discount <= 10';
  } else if (discount === '>=30') {
    sql += ' AND p.discount >= 30';
  } else if (discount === '>=50') {
    sql += ' AND p.discount >= 50';
  }

  if (stock === 'many') {
    sql += ' AND p.stock >= 20';
  } else if (stock === 'few') {
    sql += ' AND p.stock BETWEEN 1 AND 19';
  } else if (stock === 'none') {
    sql += ' AND p.stock = 0';
  }

  if (gender) {
    sql += ' AND p.gender = ?';
    params.push(gender);
  }

  if (provider) {
    sql += ' AND p.provider = ?';
    params.push(provider);
  }

  // Query count để tính totalPages
  const countSql = `SELECT COUNT(*) as total FROM products p WHERE 1=1 ${sql.split('WHERE 1=1')[1] || ''}`;
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

        // Tính resetUrl server-side
        const resetUrl = '/admin/products?search=' + encodeURIComponent(search || '');

        res.render('admin/products/list', {
          products,
          search: search || '',
          price: price || '',
          discount: discount || '',
          stock: stock || '',
          gender: gender || '',
          provider: provider || '',
          providers,
          page: parseInt(page),
          totalPages,
          resetUrl // Truyền resetUrl
        });
      });
    });
  });
};

// New product form
exports.productNewForm = (req, res) => {
  db.query('SELECT * FROM categories', (err, categories) => {
    if (err) throw err;
    res.render('admin/products/new', {
      categories,
      errors: [], // Default để tránh undefined
      formData: {} // Default
    });
  });
};

// Hàm validate product
function validateProduct(data) {
  const errors = [];
  if (!data.name) errors.push('Tên sản phẩm không được rỗng');
  if (!data.description) errors.push('Mô tả không được rỗng');
  if (!data.price || data.price <= 0) errors.push('Giá phải lớn hơn 0');
  if (!data.stock || data.stock < 0) errors.push('Stock phải >= 0');
  if (!data.image || !/^images\/.+\.(jpg|png|jpeg|gif)$/.test(data.image)) {
    errors.push('Image phải định dạng "images/tenanh.jpg" (jpg/png/jpeg/gif)');
  }
  if (!data.provider) errors.push('Nhà cung cấp không được rỗng');
  if (!data.sizes) errors.push('Sizes không được rỗng');
  if (!data.colors) errors.push('Colors không được rỗng');
  if (!data.gender || !['Nam', 'Nữ', 'Unisex'].includes(data.gender)) errors.push('Giới tính phải là Nam, Nữ hoặc Unisex');
  return errors;
}

// Create product
exports.productCreate = (req, res) => {
  const { category_id, name, description, price, discount, stock, image, provider, sizes, colors } = req.body;
  const errors = validateProduct({ name, description, price, stock, image, provider, sizes, colors });
  if (errors.length > 0) {
    db.query('SELECT * FROM categories', (err, categories) => {
      if (err) throw err;
      res.render('admin/products/new', { categories, errors, formData: req.body });
    });
    return;
  }
  const sql = `INSERT INTO products (category_id, name, description, price, discount, stock, image, provider, sizes, colors, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(sql, [category_id || null, name, description, price || 0, discount || 0, stock || 0, image || 'images/default.jpg', provider, sizes, colors, gender], (err) => {
    if (err) throw err;
    res.redirect('/admin/products');
  });
};

// Product Edit form
exports.productEditForm = (req, res) => {
  const id = req.params.id;
  db.query('SELECT * FROM categories', (err, categories) => {
    if (err) throw err;
    db.query('SELECT * FROM products WHERE product_id = ?', [id], (err2, products) => {
      if (err2) throw err2;
      if (products.length === 0) return res.status(404).send('Không tìm thấy sản phẩm');
      res.render('admin/products/edit', {
        product: products[0],
        categories,
        errors: [], // Default
        formData: products[0] // Fill ban đầu từ product
      });
    });
  });
};

// Update product
exports.productUpdate = (req, res) => {
  const id = req.params.id;
  const { category_id, name, description, price, discount, stock, image, provider, sizes, colors } = req.body;
  const errors = validateProduct({ name, description, price, stock, image, provider, sizes, colors });
  if (errors.length > 0) {
    db.query('SELECT * FROM categories', (err, categories) => {
      if (err) throw err;
      db.query('SELECT * FROM products WHERE product_id = ?', [id], (err2, products) => {
        if (err2) throw err2;
        res.render('admin/products/edit', { product: products[0], categories, errors, formData: req.body });
      });
    });
    return;
  }
  const sql = `UPDATE products SET category_id = ?, name = ?, description = ?, price = ?, discount = ?, stock = ?, image = ?, provider = ?, sizes = ?, colors = ?, gender = ? WHERE product_id = ?`;
db.query(sql, [category_id || null, name, description, price || 0, discount || 0, stock || 0, image || 'images/default.jpg', provider, sizes, colors, gender, id], (err) => {
    if (err) throw err;
    res.redirect('/admin/products');
  });
};

// Delete product
exports.productDelete = (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM products WHERE product_id = ?', [id], (err) => {
    if (err) throw err;
    res.redirect('/admin/products');
  });
};

// Orders list
exports.ordersList = (req, res) => {
  const { search, status, total } = req.query;
  let sql = `SELECT o.*, u.fullname FROM orders o LEFT JOIN users u ON o.user_id = u.user_id WHERE 1=1`;
  const params = [];

  if (search) {
    sql += ' AND u.fullname LIKE ?';
    params.push(`%${search}%`);
  }

  if (status) {
    sql += ' AND o.status = ?';
    params.push(status);
  }

  if (total === '<=5000000') {
    sql += ' AND o.total_amount <= 5000000';
  } else if (total === '>5000000') {
    sql += ' AND o.total_amount > 5000000';
  }

  sql += ' ORDER BY o.order_date DESC';

  db.query(sql, params, (err, orders) => {
    if (err) throw err;

    // Tính resetUrl server-side
    const resetUrl = '/admin/orders?search=' + encodeURIComponent(search || '');

    res.render('admin/orders/list', {
      orders,
      search: search || '',
      status: status || '',
      total: total || '',
      resetUrl // Truyền resetUrl
    });
  });
};
// Order detail
exports.orderDetail = (req, res) => {
  const id = req.params.id;
  const orderSql = `SELECT o.*, u.fullname, u.phone, u.address FROM orders o LEFT JOIN users u ON o.user_id = u.user_id WHERE o.order_id = ?`;
  const itemsSql = `SELECT oi.*, p.name FROM order_items oi LEFT JOIN products p ON oi.product_id = p.product_id WHERE oi.order_id = ?`;
  db.query(orderSql, [id], (err, orders) => {
    if (err) throw err;
    if (orders.length === 0) return res.status(404).send('Không tìm thấy đơn hàng');
    db.query(itemsSql, [id], (err2, items) => {
      if (err2) throw err2;
      res.render('admin/orders/detail', { order: orders[0], items });
    });
  });
};

// Update order status
exports.orderUpdateStatus = (req, res) => {
  const id = req.params.id;
  const { status } = req.body;
  db.query('UPDATE orders SET status = ? WHERE order_id = ?', [status, id], (err) => {
    if (err) throw err;
    res.redirect('/admin/orders/' + id);
  });
};

// Users list
exports.usersList = (req, res) => {
  const { search, role } = req.query;
  let sql = 'SELECT * FROM users WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND username LIKE ?';
    params.push(`%${search}%`);
  }

  if (role) {
    sql += ' AND role = ?';
    params.push(role);
  }

  db.query(sql, params, (err, users) => {
    if (err) throw err;

    // Tính resetUrl server-side
    const resetUrl = '/admin/users?search=' + encodeURIComponent(search || '');

    res.render('admin/users/list', {
      users,
      search: search || '',
      role: role || '',
      resetUrl // Truyền resetUrl
    });
  });
};
// Update user role
exports.userUpdateRole = (req, res) => {
  const id = req.params.id;
  const { role } = req.body;
  db.query('UPDATE users SET role = ? WHERE user_id = ?', [role, id], (err) => {
    if (err) throw err;
    res.redirect('/admin/users');
  });
};

// Delete user
exports.userDelete = (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM users WHERE user_id = ?', [id], (err) => {
    if (err) throw err;
    res.redirect('/admin/users');
  });
};

// Delete order
exports.orderDelete = (req, res) => {
  const id = req.params.id;
  // Xóa order_items trước
  db.query('DELETE FROM order_items WHERE order_id = ?', [id], (err) => {
    if (err) throw err;
    // Xóa order
    db.query('DELETE FROM orders WHERE order_id = ?', [id], (err2) => {
      if (err2) throw err2;
      res.redirect('/admin/orders');
    });
  });
};

// validate user
function validateUser(data) {
  const errors = [];
  if (!data.username) errors.push('Username không được rỗng');
  if (!data.password) errors.push('Password không được rỗng');
  if (!data.fullname) errors.push('Họ tên không được rỗng');
  if (!data.email || !data.email.endsWith('@gmail.com')) errors.push('Email phải đuôi @gmail.com');
  if (!data.phone) errors.push('SĐT không được rỗng');
  if (!data.address) errors.push('Địa chỉ không được rỗng');
  if (!data.role || !['customer', 'admin'].includes(data.role)) errors.push('Role phải customer hoặc admin');
  return errors;
}

// New user form
exports.userNewForm = (req, res) => {
  res.render('admin/users/new', {
    errors: [], // Default
    formData: {} // Default
  });
};

// Create user
exports.userCreate = async (req, res) => {
  const { username, password, fullname, email, phone, address, role } = req.body;
  const errors = validateUser({ username, password, fullname, email, phone, address, role });
  if (errors.length > 0) {
    return res.render('admin/users/new', { errors, formData: req.body });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const sql = `INSERT INTO users (username, password, fullname, email, phone, address, role) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  db.query(sql, [username, hashedPassword, fullname, email, phone, address, role], (err) => {
    if (err) throw err;
    res.redirect('/admin/users');
  });
};

// Form để input URL (vuln demo)
exports.fetchImageForm = (req, res) => {
  res.render('admin/fetch-image', { result: null, error: null });
};

/*
// Vulnerable function: Fetch URL từ input mà không validate gì cả
exports.fetchImage = async (req, res) => {
  const { url } = req.body;
  if (!url) return res.render('admin/fetch-image', { result: null, error: 'URL required' });

  // Vuln: Không validate, server fetch bất kỳ URL nào (có thể internal)
  try {
    const response = await fetch(url);
    const data = await response.text();
    res.render('admin/fetch-image', { result: data.substring(0, 500) + '...', error: null }); // Return snippet
  } catch (err) {
    res.render('admin/fetch-image', { result: null, error: err.message });
  }
};*/


// Fixed funtion: Thêm validation và SSRF filter
exports.fetchImage = async (req, res) => {
  const { url } = req.body;
  if (!url) return res.render('admin/fetch-image', { result: null, error: 'URL required' });

  // Fix 1: Validate URL (chỉ HTTPS, whitelist domain)
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:' || !['example.com', 'allowed-domain.com'].includes(parsedUrl.hostname)) {
      return res.render('admin/fetch-image', { result: null, error: 'Invalid URL: Only HTTPS and whitelisted domains allowed' });
    }
  } catch {
    return res.render('admin/fetch-image', { result: null, error: 'Malformed URL' });
  }

  // Fix 2: SSRF filter (block private/local IP)
  try {
    const response = await fetch(url, { agent: ssrfFilter() });
    const data = await response.text();
    res.render('admin/fetch-image', { result: data.substring(0, 500) + '...', error: null });
  } catch (err) {
    res.render('admin/fetch-image', { result: null, error: err.message });
  }
};

// Vulnerable function: Fetch URL từ input mà không validate gì cả - Scan Port
/*exports.fetchImage = async (req, res) => {
  const { url } = req.body;
  if (!url) return res.render('admin/fetch-image', { result: null, error: 'URL required' });

  console.log(`Scanning port via SSRF: ${url}`); // Log để track

  try {
    const startTime = Date.now(); // Đo time để demo timing attack
    const response = await fetch(url, { timeout: 5000 }); // Timeout để avoid hang
    const data = await response.text();
    const endTime = Date.now();
    console.log(`Scan time: ${endTime - startTime}ms`);
    res.render('admin/fetch-image', { result: data.substring(0, 500) + '...', error: null });
  } catch (err) {
    console.error(`Scan error: ${err.message}`);
    res.render('admin/fetch-image', { result: null, error: err.message });
  }
};*/
