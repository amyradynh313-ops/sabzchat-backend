const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOAD_DIR || './uploads'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

// حداکثر حجم فایل: ۵۰ مگابایت (برای ویدیو/صوت قابل تنظیمه)
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

module.exports = upload;
