Tóm tắt nhanh codebase - Project_NgonNguKichBan

Mục tiêu: Web shop "NEM Sport Fashion" (Node + Express + EJS + MySQL).

Cấu trúc chính:
- `app.js` - entrypoint, cấu hình EJS, static, session, routes.
- `package.json` - dependencies: express, ejs, mysql2, bcrypt, express-session, body-parser.
- `config/db.js` - (cấu hình kết nối DB) — đã đọc trước.
- `controllers/` - business logic (productController, cartController, userController, adminController, checkoutController).
- `routes/` - mapping HTTP -> controllers.
- `views/` - EJS templates (partials/header.ejs, partials/footer.ejs, products.ejs, product_detail.ejs, index.ejs, ...).
- `public/` - assets (css, images, js). `public/css/style.css` đã được cập nhật (theme dark/navy, responsive grid, card, effects).
- `db.text` - SQL dump MariaDB (bảng: users, products, categories, carts, cart_items, orders, order_items, wishlists, reviews, posts) với dữ liệu mẫu.

Các thay đổi tôi đã thực hiện:
- Viết lại `public/css/style.css` (responsive, biến CSS, navbar, hero, grid, card, action buttons, animations).
- Chỉnh sửa các view chính để sử dụng lớp CSS mới: `views/partials/header.ejs`, `views/partials/footer.ejs`, `views/products.ejs`, `views/product_detail.ejs`, `views/index.ejs`.

Hướng dẫn chạy app local (Windows PowerShell):

```powershell
# 1) Cài dependencies
npm install

# 2) Import DB (nếu muốn dùng dữ liệu mẫu) - dùng MySQL/MariaDB client, ví dụ:
# mysql -u root -p shoe_store < db.text

# 3) Thiết lập config/db.js nếu cần (host, user, password, database)

# 4) Chạy server
node app.js
# Mở: http://localhost:3000
```

Bước tiếp theo tôi đề xuất:
1. Chạy app local và kiểm tra giao diện trên trình duyệt (desktop + mobile). Tôi có thể hướng dẫn hoặc chạy test CSS giả lập.
2. Tinh chỉnh spacing, font-size, màu theo feedback.
3. Thêm small JS animation nếu cần (ví dụ lazy-loading, thêm hiệu ứng thêm giỏ hàng).

Nếu bạn đồng ý, tôi sẽ đánh dấu các todo tương ứng là hoàn tất và hướng dẫn bạn chạy local để kiểm tra trực tiếp.
