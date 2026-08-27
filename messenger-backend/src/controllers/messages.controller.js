const prisma = require('../config/db');

// تاریخچه پیام‌های یک چت با صفحه‌بندی (پیام‌های جدید اول لود می‌شن)
async function getMessages(req, res) {
  const { chatId } = req.params;
  const { before, limit = 30 } = req.query;

  const messages = await prisma.message.findMany({
    where: {
      chatId,
      deletedAt: null,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: Number(limit),
    include: {
      sender: { select: { id: true, displayName: true, avatarUrl: true } },
      reactions: true,
      replyTo: { select: { id: true, content: true, senderId: true } },
    },
  });

  res.json(messages.reverse());
}

// پیام‌های واقعی معمولاً از طریق Socket.IO ارسال می‌شن (برای سرعت لحظه‌ای)
// این روت بیشتر برای آپلود پیام‌های حاوی فایل/مدیاست که اول باید آپلود بشه
async function uploadMedia(req, res) {
  if (!req.file) return res.status(400).json({ error: 'فایلی ارسال نشده' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
}

async function reactToMessage(req, res) {
  const { messageId } = req.params;
  const { emoji } = req.body;

  const reaction = await prisma.messageReaction.upsert({
    where: { messageId_userId_emoji: { messageId, userId: req.userId, emoji } },
    update: {},
    create: { messageId, userId: req.userId, emoji },
  });
  res.json(reaction);
}

async function markAsRead(req, res) {
  const { chatId } = req.params;
  await prisma.chatParticipant.update({
    where: { chatId_userId: { chatId, userId: req.userId } },
    data: { lastReadAt: new Date() },
  });
  await prisma.message.updateMany({
    where: { chatId, senderId: { not: req.userId }, status: { not: 'READ' } },
    data: { status: 'READ' },
  });
  res.json({ ok: true });
}

module.exports = { getMessages, uploadMedia, reactToMessage, markAsRead };
