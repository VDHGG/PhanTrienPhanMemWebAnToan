const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'shoe_store'
});

connection.connect((err) => {
  if (err) {
    console.error('Lỗi kết nối MySQL:', err);
  } else {
    console.log('✅ Kết nối MySQL thành công!');
  }
});

module.exports = connection;
