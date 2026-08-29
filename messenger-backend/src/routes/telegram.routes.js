const express = require('express');
const router = express.Router();
const prisma = require('../config/db');

// شماره رو یکدست می‌کنه (چه با +98 بیاد، چه با 0، چه فقط رقم خالی) تا همیشه با هم مچ بشن
function normalizePhone(raw) {
  let p = raw.replace(/[^\d]/g, ''); // فقط رقم‌ها
  if (p.startsWith('98') && p.length === 12) p = '0' + p.slice(2);
  if (p.length === 10 && p.startsWith('9')) p = '0' + p;
  return p;
}

// وقتی یه پیام جدید به بات تلگرام برسه، تلگرام این آدرس رو صدا می‌زنه (webhook)
router.post('/webhook', async (req, res) => {
  try {
    const message = req.body.message;
    if (!message) return res.sendStatus(200);
    const chatId = String(message.chat.id);

    // حالت ۱: کاربر رو دکمه‌ی "اشتراک‌گذاری شماره" زده (بهترین حالت، بدون تایپ)
    if (message.contact && message.contact.phone_number) {
      // مطمئن می‌شیم این شماره‌ی خودِ فرستنده‌ست، نه یه مخاطب دیگه که فوروارد کرده
      const isOwnContact = message.contact.user_id && message.from && message.contact.user_id === message.from.id;
      if (!isOwnContact) {
        await sendTelegramMessage(chatId, '⚠️ فقط شماره‌ی خودِ حسابت قابل ثبته. لطفاً از دکمه‌ی "اشتراک‌گذاری شماره من" استفاده کن، نه انتخاب یه مخاطب دیگه.');
        return res.sendStatus(200);
      }

      const phone = normalizePhone(message.contact.phone_number);
      await prisma.telegramLink.upsert({
        where: { phone },
        update: { chatId },
        create: { phone, chatId },
      });
      await sendTelegramMessage(chatId, '✅ شماره‌ت ثبت شد! از این به بعد وقتی تو سایت وارد میشی، کد تایید مستقیم همینجا برات میاد.');
      return res.sendStatus(200);
    }

    // حالت ۲: پیام /start یا هر پیام دیگه — دکمه‌ی اشتراک‌گذاری شماره رو نشون می‌ده
    await sendTelegramMessage(
      chatId,
      '👋 سلام! برای دریافت خودکار کد تایید سبزچت، دکمه‌ی زیر رو بزن تا شماره‌ت ثبت بشه.',
      {
        keyboard: [[{ text: '📱 اشتراک‌گذاری شماره من', request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      }
    );
    res.sendStatus(200);
  } catch (err) {
    console.error('Telegram webhook error:', err.message);
    res.sendStatus(200);
  }
});

async function sendTelegramMessage(chatId, text, replyMarkup) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });
}

module.exports = router;
module.exports.normalizePhone = normalizePhone;
