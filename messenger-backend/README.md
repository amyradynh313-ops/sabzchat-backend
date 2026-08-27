# سبزچت — Backend

بک‌اند کامل پیام‌رسان سبزچت. Node.js + Express (REST) + Socket.IO (real-time) + PostgreSQL (با Prisma).

## معماری

```
src/
  server.js          نقطه ورود: Express + Socket.IO رو راه می‌ندازه
  config/            اتصال دیتابیس و تنظیمات آپلود فایل
  middleware/         احراز هویت JWT برای روت‌های REST
  routes/             تعریف مسیرهای API
  controllers/         منطق هر روت (auth, users, chats, messages, stories)
  sockets/index.js    قلب real-time: پیام لحظه‌ای، تایپینگ، آنلاین‌بودن، سیگنالینگ تماس
prisma/schema.prisma  مدل کامل دیتابیس
```

## چرا این استک؟

- **PostgreSQL + Prisma**: چون گروه، مدیا، استوری، تماس و روابط پیچیده بین‌شون داریم، یه دیتابیس رابطه‌ای با تایپ ایمن بهتر از NoSQL جواب می‌ده.
- **Socket.IO**: برای پیام لحظه‌ای، وضعیت آنلاین/آفلاین، تایپینگ، و سیگنالینگ تماس (رد و بدل کردن SDP/ICE بین دو طرف تماس WebRTC).
- **WebRTC برای تماس**: صدا/تصویر مستقیم بین دو کاربر (peer-to-peer) رد و بدل می‌شه، نه از سرور — سرور فقط واسطه‌ی برقراری اتصاله (signaling). برای عبور از NAT به یه سرور TURN نیاز داری (مثل coturn خودت یا سرویس Twilio).

## راه‌اندازی

```bash
npm install
cp .env.example .env      # مقادیر واقعی رو پر کن (دیتابیس، JWT_SECRET و ...)
npx prisma migrate dev    # جدول‌ها رو تو دیتابیس می‌سازه
npm run dev                # سرور رو با نودمون بالا می‌ندازه
```

سرور روی `http://localhost:4000` بالا میاد، Socket.IO هم روی همون پورت.

## جریان احراز هویت

۱. `POST /api/auth/otp/request` با `{ phone }` → کد ۶ رقمی ساخته می‌شه (فعلاً تو کنسول لاگ می‌شه، باید به یه سرویس پیامک وصلش کنی)
۲. `POST /api/auth/otp/verify` با `{ phone, code, displayName }` → اگه کاربر جدید باشه ساخته می‌شه، بعد JWT برمی‌گرده
۳. توکن رو تو هدر `Authorization: Bearer <token>` بفرست برای بقیه‌ی روت‌ها، و تو `handshake.auth.token` وقتی به Socket.IO وصل می‌شی

## رویدادهای Socket.IO مهم

| رویداد | جهت | توضیح |
|---|---|---|
| `message:send` | client → server | ارسال پیام جدید |
| `message:new` | server → client | پیام جدید به همه‌ی اعضای چت |
| `typing:start/stop` | دوطرفه | نشون‌دادن «در حال نوشتن...» |
| `message:read` | client → server | خوندن پیام‌ها (تیک آبی) |
| `call:invite` | client → server | شروع تماس، بقیه اعضا زنگ می‌خورن |
| `call:signal` | دوطرفه | رد و بدل SDP/ICE برای اتصال WebRTC |
| `presence:update` | server → client | آنلاین/آفلاین شدن یه کاربر |

## قدم‌های بعدی که هنوز پیاده نشدن

- ارسال واقعی پیامک OTP (اتصال به یه ارائه‌دهنده SMS ایرانی)
- Push notification (FCM/APNs) برای وقتی اپ بسته‌ست
- پاک‌سازی خودکار استوری‌های منقضی‌شده (یه cron job ساده کافیه)
- آپلود مدیا به یه object storage واقعی به‌جای دیسک لوکال سرور
- rate limiting روی روت‌های حساس (مخصوصاً OTP)
