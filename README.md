# NEM Fashion Sport - Web Shop Với Demo An Toàn Chống SSRF

## Giới thiệu ngắn gọn về đề tài
Dự án NEM Fashion Sport là một ứng dụng web bán hàng thời trang thể thao (giày dép, quần áo, phụ kiện), được phát triển để minh họa đề tài "Xây dựng ứng dụng web an toàn chống tấn công SSRF (Server-Side Request Forgery)". Dự án bao gồm các tính năng cơ bản như quản lý sản phẩm, giỏ hàng, thanh toán (COD/VNPay), wishlist, reviews, và admin panel. Phần chính của đề tài là demo lỗ hổng SSRF (tấn công leak data internal và scan port), cùng cách hạn chế (validate URL, whitelist, block private IP). Mục tiêu là chứng minh rủi ro SSRF trong web app và cách bảo vệ.

## Công nghệ sử dụng
- **Ngôn ngữ lập trình**: Node.js (JavaScript server-side).
- **Framework**: Express.js (web framework).
- **Template engine**: EJS (Embedded JavaScript templates).
- **Database**: MySQL/MariaDB (qua module mysql2).
- **Thư viện chính**:
  - bcrypt: Hash password.
  - express-session: Quản lý session (cart, auth).
  - vnpay: Tích hợp thanh toán VNPay.
  - node-fetch: Fetch URL (demo SSRF vuln).
  - ssrf-req-filter: Chống SSRF (fix vuln).
- **Công cụ khác**: XAMPP (local MySQL), Ngrok (expose localhost cho test VNPay/SSRF).

## Cấu trúc thư mục dự án
Dự án theo cấu trúc MVC đơn giản cho Express:
- **app.js**: Entry point, setup server, routes, session.
- **config/**: Cấu hình (db.js cho DB connect, vnpay.js cho VNPay).
- **controllers/**: Logic business (adminController.js, cartController.js, checkoutController.js, productController.js, userController.js – chứa demo SSRF vuln/fix).
- **middlewares/**: Middleware (isAdmin.js, isLoggedIn.js).
- **public/**: Assets tĩnh (css/style.css, images/ cho product banners).
- **routes/**: Định nghĩa routes (adminRoute.js, cartRoute.js, checkoutRoute.js, homeRoute.js, productRoute.js, userRoute.js).
- **views/**: Templates EJS.
  - **admin/**: Views admin (dashboard.ejs, orders/detail.ejs & list.ejs, products/edit.ejs & list.ejs & new.ejs, users/list.ejs & new.ejs, fetch-image.ejs cho demo SSRF).
  - **partials/**: Header/footer reusable (header.ejs, footer.ejs).
  - **profile/**: User profile (edit.ejs, order_detail.ejs, orders.ejs).
  - Các file chính: cart.ejs, checkout.ejs, index.ejs (home), login.ejs, product_detail.ejs, products.ejs, register.ejs, success.ejs, wishlist.ejs.
- **db.text**: SQL dump cho database shoe_store.
- **node_modules/** & **package.json**: Dependencies (tự generate từ npm install).

## Hướng dẫn cài đặt & chạy chương trình
### Yêu cầu môi trường
- Node.js: Phiên bản 14+ (tải tại https://nodejs.org).
- MySQL/MariaDB: Phiên bản 8+ (sử dụng XAMPP hoặc WAMP cho local server).
- Hệ điều hành: Windows/Mac/Linux (test trên Windows).

### Cách import database
1. Khởi động MySQL (qua XAMPP: Start MySQL module).
2. Tạo DB: Mở phpMyAdmin[](http://localhost/phpmyadmin), tạo database tên `shoe_store`.
3. Import SQL: Chạy lệnh trong cmd/PowerShell (cd đến project folder):

#### Ảnh về trang web
<img width="1901" height="910" alt="image" src="https://github.com/user-attachments/assets/d1a979a5-2c9a-4b5a-904b-d3da04ebed45" />
<img width="1896" height="909" alt="image" src="https://github.com/user-attachments/assets/b2a2c982-a211-4127-b6b2-ecfa64f98daf" />
<img width="1898" height="900" alt="image" src="https://github.com/user-attachments/assets/58f486b1-3e4d-4a6e-a664-d1e7d137e7a3" />
<img width="1898" height="910" alt="image" src="https://github.com/user-attachments/assets/4ecd253a-017f-428b-b1ec-d52962894c19" />


