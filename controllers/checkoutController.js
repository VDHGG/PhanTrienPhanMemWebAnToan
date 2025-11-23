const db = require('../config/db');
const vnpayConfig = require('../config/vnpay');
const VNPay = require('vnpay').VNPay;

exports.showCheckout = (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const cart = req.session.cart || [];

  if (cart.length === 0) {
    return res.redirect('/cart');
  }

  // Tính tổng sau giảm
  const total = cart.reduce((sum, item) => {
    const item_price_after = item.price * (1 - item.discount / 100);
    return sum + item_price_after * item.quantity;
  }, 0);

  res.render('checkout', { cart, total });
};

exports.processCheckout = (req, res) => {
  const { fullname, address, phone, payment_method } = req.body;
  const cart = req.session.cart || [];

  if (cart.length === 0) {
    return res.redirect('/cart');
  }

  // Tính tổng sau giảm
  const totalAmount = cart.reduce((sum, item) => {
    const item_price_after = item.price * (1 - item.discount / 100);
    return sum + item_price_after * item.quantity;
  }, 0);

  const user_id = req.session.user.id;

  const orderSql = 'INSERT INTO orders (user_id, total_amount, status, payment_method) VALUES (?, ?, ?, ?)';
  db.query(orderSql, [user_id, totalAmount, 'Pending', payment_method], (err, orderResult) => {
    if (err) {
      console.error('Lỗi tạo order:', err);
      return res.status(500).send('Lỗi server khi tạo đơn hàng');
    }

    const orderId = orderResult.insertId;

    // Lưu order_items với price là giá sau giảm
    const orderItemsSql = 'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?';
    const orderItemsData = cart.map(item => {
      const item_price_after = item.price * (1 - item.discount / 100);
      return [orderId, item.id, item.quantity, item_price_after];
    });

    db.query(orderItemsSql, [orderItemsData], (err2) => {
      if (err2) {
        console.error('Lỗi lưu order items:', err2);
        return res.status(500).send('Lỗi server khi lưu chi tiết đơn hàng');
      }

      req.session.cart = [];

      if (payment_method === 'COD') {
        res.render('success', { fullname, address, phone, totalAmount });
      } else if (payment_method === 'VNPAY') {
        try {
          const gateway = new VNPay({
            tmnCode: vnpayConfig.vnp_TmnCode,
            secureSecret: vnpayConfig.vnp_HashSecret,
            vnpayHost: vnpayConfig.vnp_Url,
            returnUrl: vnpayConfig.vnp_ReturnUrl
          });

          const date = new Date();
          const createDate = new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().replace(/[-:T]/g, '').slice(0, 14);
          const expireDate = new Date(date.getTime() + 7 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString().replace(/[-:T]/g, '').slice(0, 14);

          const params = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: vnpayConfig.vnp_TmnCode,
            vnp_Amount: totalAmount * 100,
            vnp_CurrCode: 'VND',
            vnp_TxnRef: orderId.toString(),
            vnp_OrderInfo: `Thanh toan don hang #${orderId}`,
            vnp_OrderType: 'billpayment',
            vnp_Locale: 'vn',
            vnp_ReturnUrl: vnpayConfig.vnp_ReturnUrl,
            vnp_IpAddr: req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1',
            vnp_CreateDate: createDate,
            vnp_ExpireDate: expireDate
          };

          console.log('VNPay params before build:', params);

          const paymentUrl = gateway.buildPaymentUrl(params);

          console.log('Generated VNPay URL:', paymentUrl);
          res.redirect(paymentUrl);
        } catch (error) {
          console.error('Lỗi tạo VNPay gateway:', error);
          res.status(500).send('Lỗi khi tạo link thanh toán VNPay.');
        }
      } else {
        res.status(400).send('Phương thức thanh toán không hỗ trợ');
      }
    });
  });
};

// Handle return URL từ VNPay
exports.vnpayReturn = (req, res) => {
  const gateway = new VNPay({
    tmnCode: vnpayConfig.vnp_TmnCode,
    secureSecret: vnpayConfig.vnp_HashSecret
  });

  const query = req.query;
  const isValid = gateway.verifyReturnUrl(query);

  if (!isValid) {
    return res.send('Giao dịch không hợp lệ hoặc bị hủy.');
  }

  const orderId = query.vnp_TxnRef;
  const rspCode = query.vnp_ResponseCode;

  let newStatus = 'Pending';
  if (rspCode === '00') {
    newStatus = 'Confirmed';
  } else {
    newStatus = 'Cancelled';
  }

  db.query('UPDATE orders SET status = ? WHERE order_id = ?', [newStatus, orderId], (err) => {
    if (err) {
      console.error('Lỗi update status từ return:', err);
      return res.status(500).send('Lỗi server');
    }

    if (newStatus === 'Confirmed') {
      // Lấy info từ DB để render success
      db.query('SELECT u.fullname, u.address, u.phone, o.total_amount FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.order_id = ?', [orderId], (err2, results) => {
        if (err2 || results.length === 0) return res.send('Đơn hàng không tìm thấy');
        const { fullname, address, phone, total_amount } = results[0];
        res.render('success', { fullname, address, phone, totalAmount: total_amount });
      });
    } else {
      res.send('Giao dịch thất bại. Mã lỗi: ' + rspCode);
    }
  });
};

// Handle IPN (server callback)
exports.vnpayIpn = (req, res) => {
  const gateway = new VNPay({
    tmnCode: vnpayConfig.vnp_TmnCode,
    secureSecret: vnpayConfig.vnp_HashSecret
  });

  const query = req.query;
  const isValid = gateway.verifyIpnCall(query);

  if (!isValid) {
    return res.json({ RspCode: '97', Message: 'Invalid signature' });
  }

  const orderId = query.vnp_TxnRef;
  const rspCode = query.vnp_ResponseCode;

  let newStatus = 'Pending';
  if (rspCode === '00') {
    newStatus = 'Confirmed';
  } else {
    newStatus = 'Cancelled';
  }

  db.query('UPDATE orders SET status = ? WHERE order_id = ?', [newStatus, orderId], (err) => {
    if (err) {
      console.error('Lỗi update status từ IPN:', err);
      return res.json({ RspCode: '99', Message: 'Server error' });
    }
    res.json({ RspCode: '00', Message: 'Confirm Success' });
  });
};
