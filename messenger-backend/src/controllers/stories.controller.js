const prisma = require('../config/db');

// یک استوری تازه (۲۴ ساعت اعتبار داره)
async function createStory(req, res) {
  const { mediaUrl, type = 'IMAGE', caption } = req.body;
  const story = await prisma.story.create({
    data: {
      userId: req.userId,
      mediaUrl,
      type,
      caption,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  res.status(201).json(story);
}

// استوری‌های مخاطبین که هنوز منقضی نشدن
async function getStoriesFeed(req, res) {
  const contacts = await prisma.contact.findMany({ where: { ownerId: req.userId } });
  const contactIds = contacts.map((c) => c.targetId);

  const stories = await prisma.story.findMany({
    where: { userId: { in: [...contactIds, req.userId] }, expiresAt: { gt: new Date() } },
    include: {
      user: { select: { id: true, displayName: true, avatarUrl: true } },
      views: { where: { viewerId: req.userId }, select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(stories);
}

async function viewStory(req, res) {
  const { storyId } = req.params;
  const view = await prisma.storyView.upsert({
    where: { storyId_viewerId: { storyId, viewerId: req.userId } },
    update: {},
    create: { storyId, viewerId: req.userId },
  });
  res.json(view);
}

module.exports = { createStory, getStoriesFeed, viewStory };
