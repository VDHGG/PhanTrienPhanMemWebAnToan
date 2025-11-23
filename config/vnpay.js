// config/vnpay.js
module.exports = {
  vnp_TmnCode: 'XVUPY3B7', // Lấy từ VNPay sandbox (đăng ký tại https://sandbox.vnpayment.vn/apis/docs/testcard/)
  vnp_HashSecret: '9I3P4Z9T6H3FW750WDAJC56THTDWWVR5', // Từ VNPay
  vnpayHost: 'https://sandbox.vnpayment.vn', // Sửa: Chỉ base URL, thư viện sẽ append /paymentv2/vpcpay.html tự động
  vnp_ReturnUrl: 'https://maryellen-unexpellable-hysterically.ngrok-free.dev/checkout/vnpay-return', // Callback sau thanh toán (dùng ngrok nếu test real device)
  vnp_IpnUrl: 'https://maryellen-unexpellable-hysterically.ngrok-free.dev/checkout/vnpay-ipn' // IPN (server-to-server)
};
