const prisma = require('../config/db');

async function getMe(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  res.json(user);
}

async function updateMe(req, res) {
  const { displayName, bio, avatarUrl, username } = req.body;
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { displayName, bio, avatarUrl, username },
  });
  res.json(user);
}

// جستجوی کاربر با شماره یا یوزرنیم برای شروع یه چت جدید
async function searchUsers(req, res) {
  const { q } = req.query;
  if (!q) return res.json([]);

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { phone: { contains: q } },
        { username: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
      ],
      NOT: { id: req.userId },
    },
    take: 20,
    select: { id: true, displayName: true, username: true, avatarUrl: true, isOnline: true },
  });
  res.json(users);
}

async function addContact(req, res) {
  const { targetId, nickname } = req.body;
  const contact = await prisma.contact.upsert({
    where: { ownerId_targetId: { ownerId: req.userId, targetId } },
    update: { nickname },
    create: { ownerId: req.userId, targetId, nickname },
  });
  res.json(contact);
}

async function listContacts(req, res) {
  const contacts = await prisma.contact.findMany({
    where: { ownerId: req.userId },
    include: { target: { select: { id: true, displayName: true, avatarUrl: true, isOnline: true, lastSeenAt: true } } },
  });
  res.json(contacts);
}

module.exports = { getMe, updateMe, searchUsers, addContact, listContacts };
