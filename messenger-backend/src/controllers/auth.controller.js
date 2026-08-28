const prisma = require('../config/db');
const { signToken } = require('../utils/jwt');

// در حافظه نگه‌داری کدهای تایید (برای پروداکشن باید Redis با TTL استفاده بشه)
const otpStore = new Map(); // phone -> { code, expiresAt }

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// کد تایید رو از طریق بات تلگرام می‌فرسته (چون سرویس پیامک ایرانی هنوز وصل نشده)
async function sendOtpViaTelegram(phone, code) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.log(`[OTP] ${phone} -> ${code}`); // fallback: لاگ ساده اگه بات تنظیم نشده باشه
    return;
  }
  const text = `🌱 سبزچت\nکد تایید برای ${phone}:\n${code}`;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err) {
    console.error('ارسال پیام تلگرام ناموفق بود:', err.message);
    console.log(`[OTP fallback] ${phone} -> ${code}`);
  }
}

// مرحله ۱: کاربر شماره موبایلشو می‌فرسته، کد تایید ساخته و از طریق بات تلگرام ارسال می‌شه
async function requestOtp(req, res) {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'شماره موبایل الزامیه' });

  const code = generateOtp();
  otpStore.set(phone, { code, expiresAt: Date.now() + 2 * 60 * 1000 });

  await sendOtpViaTelegram(phone, code);

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

