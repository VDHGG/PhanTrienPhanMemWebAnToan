const express = require('express');
const path = require('path');
const session = require('express-session');
const productRoute = require('./routes/productRoute');
const cartRoute = require('./routes/cartRoute');
const checkoutRoute = require('./routes/checkoutRoute');
const userRoute = require('./routes/userRoute');
const homeRoute = require('./routes/homeRoute');
const adminRoute = require('./routes/adminRoute');
const app = express();
const PORT = 3000;

// Cấu hình EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// Public folder (cho ảnh local)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware để đọc form
app.use(express.urlencoded({ extended: true }));

// 🧠 Cấu hình session
app.use(session({
  secret: 'shoestore_secret',
  resave: false,
  saveUninitialized: true
}));

//middleware để đọc session
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Routes
app.use('/', homeRoute);           // 🏠 Trang chủ (hiển thị sản phẩm + tin tức)
app.use('/products', productRoute); // Trang danh sách / chi tiết sản phẩm
app.use('/cart', cartRoute);
app.use('/checkout', checkoutRoute);
app.use('/', userRoute);
app.use('/admin', adminRoute);

// app.js (add internal route chỉ access từ localhost để demo leak)
app.get('/internal-secret', (req, res) => {
  // Chỉ cho phép từ localhost (internal)
  if (req.connection.remoteAddress !== '::1' && req.connection.remoteAddress !== '127.0.0.1') {
    return res.status(403).send('Forbidden - External access denied');
  }
  res.send('Secret data leaked via SSRF: DB password = password của nick admin, Admin key = thông tin nhạy cảm khác...');
});

app.listen(PORT, () => {
  console.log(`Server đang chạy tại: http://localhost:${PORT}`);
});
