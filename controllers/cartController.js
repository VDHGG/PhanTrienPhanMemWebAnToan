const db = require('../config/db');

exports.addToCart = (req, res) => {
  const { id, name, price, image, size, color, quantity } = req.body;
  const qtyToAdd = parseInt(quantity) || 1;

  if (!req.session.cart) {
    req.session.cart = [];
  }

  const existingItem = req.session.cart.find(item => item.id === parseInt(id) && (item.size || '') === (size || '') && (item.color || '') === (color || ''));

  if (existingItem) {
    existingItem.quantity += qtyToAdd;
    return res.redirect('/cart');
  }

  const sql = 'SELECT p.*, c.category_id FROM products p LEFT JOIN categories c ON p.category_id = c.category_id WHERE p.product_id = ?';
  db.query(sql, [id], (err, results) => {
    if (err) throw err;
    if (results.length === 0) return res.redirect('/products');

    const product = results[0];

    req.session.cart.push({
      id: product.product_id,
      name: product.name,
      price: parseFloat(product.price),
      discount: parseFloat(product.discount || 0), // Thêm discount từ DB
      image: product.image,
      quantity: qtyToAdd,
      category_id: product.category_id,
      size: size || null,
      color: color || null
    });

    res.redirect('/cart');
  });
};

exports.viewCart = (req, res) => {
  const cart = req.session.cart || [];
  res.render('cart', { cart });
};

exports.removeItem = (req, res) => {
  const param = req.params.id;
  if (!req.session.cart) return res.redirect('/cart');

  const idx = parseInt(param);
  if (!isNaN(idx) && idx >= 0 && idx < req.session.cart.length) {
    req.session.cart.splice(idx, 1);
  } else {
    const pid = parseInt(param);
    if (!isNaN(pid)) {
      req.session.cart = req.session.cart.filter(item => item.id !== pid);
    }
  }

  res.redirect('/cart');
};
