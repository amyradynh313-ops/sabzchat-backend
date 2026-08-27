const prisma = require('../config/db');
const { signToken } = require('../utils/jwt');

// در حافظه نگه‌داری کدهای تایید (برای پروداکشن باید Redis با TTL استفاده بشه)
const otpStore = new Map(); // phone -> { code, expiresAt }

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// مرحله ۱: کاربر شماره موبایلشو می‌فرسته، کد تایید ساخته و (فعلاً) لاگ می‌شه
// در پروداکشن اینجا باید به یه سرویس پیامک (کاوه‌نگار، Twilio و...) وصل بشه
async function requestOtp(req, res) {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'شماره موبایل الزامیه' });

  const code = generateOtp();
  otpStore.set(phone, { code, expiresAt: Date.now() + 2 * 60 * 1000 });

  console.log(`[OTP] ${phone} -> ${code}`); // TODO: جایگزین با ارسال پیامک واقعی

  res.json({ message: 'کد تایید ارسال شد' });
}

// مرحله ۲: کاربر کد رو تایید می‌کنه، اگه کاربر جدیده ساخته می‌شه، بعد توکن صادر می‌شه
async function verifyOtp(req, res) {
  const { phone, code, displayName } = req.body;
  const record = otpStore.get(phone);

  if (!record || record.code !== code || Date.now() > record.expiresAt) {
    return res.status(400).json({ error: 'کد نامعتبر یا منقضی‌شده' });
  }
  otpStore.delete(phone);

  let user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    user = await prisma.user.create({
      data: { phone, displayName: displayName || 'کاربر جدید' },
    });
  }

  const token = signToken(user.id);
  res.json({ token, user });
}

module.exports = { requestOtp, verifyOtp };
