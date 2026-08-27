const prisma = require('../config/db');

// لیست چت‌های کاربر، مرتب‌شده بر اساس آخرین پیام
async function listChats(req, res) {
  const participations = await prisma.chatParticipant.findMany({
    where: { userId: req.userId },
    include: {
      chat: {
        include: {
          participants: { include: { user: { select: { id: true, displayName: true, avatarUrl: true, isOnline: true } } } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
    orderBy: { chat: { messages: { _count: 'desc' } } }, // placeholder ordering; real app sorts by last message time client-side or via raw query
  });

  const chats = participations.map((p) => ({
    id: p.chat.id,
    type: p.chat.type,
    title: p.chat.title,
    avatarUrl: p.chat.avatarUrl,
    isPinned: p.isPinned,
    isMuted: p.isMuted,
    participants: p.chat.participants.map((pp) => pp.user),
    lastMessage: p.chat.messages[0] || null,
  }));

  res.json(chats);
}

// شروع یه چت مستقیم (یا برگردوندن چتی که از قبل وجود داره)
async function startDirectChat(req, res) {
  const { targetUserId } = req.body;

  const existing = await prisma.chat.findFirst({
    where: {
      type: 'DIRECT',
      AND: [
        { participants: { some: { userId: req.userId } } },
        { participants: { some: { userId: targetUserId } } },
      ],
    },
  });
  if (existing) return res.json(existing);

  const chat = await prisma.chat.create({
    data: {
      type: 'DIRECT',
      participants: {
        create: [{ userId: req.userId }, { userId: targetUserId }],
      },
    },
  });
  res.status(201).json(chat);
}

async function createGroup(req, res) {
  const { title, memberIds = [], avatarUrl } = req.body;

  const chat = await prisma.chat.create({
    data: {
      type: 'GROUP',
      title,
      avatarUrl,
      participants: {
        create: [
          { userId: req.userId, role: 'OWNER' },
          ...memberIds.map((id) => ({ userId: id, role: 'MEMBER' })),
        ],
      },
    },
  });
  res.status(201).json(chat);
}

async function pinChat(req, res) {
  const { chatId } = req.params;
  const { isPinned } = req.body;
  await prisma.chatParticipant.update({
    where: { chatId_userId: { chatId, userId: req.userId } },
    data: { isPinned },
  });
  res.json({ ok: true });
}

async function muteChat(req, res) {
  const { chatId } = req.params;
  const { isMuted } = req.body;
  await prisma.chatParticipant.update({
    where: { chatId_userId: { chatId, userId: req.userId } },
    data: { isMuted },
  });
  res.json({ ok: true });
}

module.exports = { listChats, startDirectChat, createGroup, pinChat, muteChat };
