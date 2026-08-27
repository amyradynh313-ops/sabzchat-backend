const { verifyToken } = require('../utils/jwt');

// این میدلور مطمئن می‌شه درخواست یه توکن معتبر داره
// و req.userId رو برای استفاده در روت‌های بعدی ست می‌کنه
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'توکن ارسال نشده' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'توکن نامعتبر یا منقضی‌شده' });
  }
}

module.exports = { requireAuth };
