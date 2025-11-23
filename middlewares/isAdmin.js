module.exports = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(403).send('Truy cập bị từ chối. Yêu cầu quyền admin.');
};
