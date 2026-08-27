const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/db');

// userId -> Set(socketId)   (یه کاربر می‌تونه از چند دستگاه وصل باشه)
const onlineUsers = new Map();

function addSocket(userId, socketId) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
}
function removeSocket(userId, socketId) {
  onlineUsers.get(userId)?.delete(socketId);
  if (onlineUsers.get(userId)?.size === 0) onlineUsers.delete(userId);
}
function isOnline(userId) {
  return onlineUsers.has(userId);
}

function initSockets(io) {
  // احراز هویت هر اتصال با JWT (کلاینت توکن رو در handshake.auth.token می‌فرسته)
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const payload = verifyToken(token);
      socket.userId = payload.userId;
      next();
    } catch (err) {
      next(new Error('احراز هویت نامعتبر'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    addSocket(userId, socket.id);

    // کاربر رو عضو یه room شخصی می‌کنیم تا بشه مستقیم پیام بهش فرستاد
    socket.join(`user:${userId}`);

    await prisma.user.update({ where: { id: userId }, data: { isOnline: true } });
    broadcastPresence(io, userId, true);

    // کاربر وارد room تمام چت‌هایی که عضوشونه می‌شه
    const participations = await prisma.chatParticipant.findMany({ where: { userId } });
    participations.forEach((p) => socket.join(`chat:${p.chatId}`));

    // ---------- پیام‌رسانی ----------
    socket.on('message:send', async (data, callback) => {
      const { chatId, content, type = 'TEXT', mediaUrl, replyToId } = data;
      try {
        const message = await prisma.message.create({
          data: { chatId, senderId: userId, content, type, mediaUrl, replyToId, status: 'SENT' },
          include: { sender: { select: { id: true, displayName: true, avatarUrl: true } } },
        });
        io.to(`chat:${chatId}`).emit('message:new', message);
        callback?.({ ok: true, message });
      } catch (err) {
        callback?.({ ok: false, error: err.message });
      }
    });

    socket.on('message:delivered', async ({ messageId }) => {
      const message = await prisma.message.update({
        where: { id: messageId },
        data: { status: 'DELIVERED' },
      });
      io.to(`chat:${message.chatId}`).emit('message:status', { messageId, status: 'DELIVERED' });
    });

    socket.on('message:read', async ({ chatId }) => {
      await prisma.message.updateMany({
        where: { chatId, senderId: { not: userId }, status: { not: 'READ' } },
        data: { status: 'READ' },
      });
      socket.to(`chat:${chatId}`).emit('message:status', { chatId, readerId: userId, status: 'READ' });
    });

    // ---------- در حال نوشتن ----------
    socket.on('typing:start', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('typing:start', { chatId, userId });
    });
    socket.on('typing:stop', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('typing:stop', { chatId, userId });
    });

    // ---------- ریاکشن ----------
    socket.on('reaction:add', async ({ messageId, emoji }) => {
      const reaction = await prisma.messageReaction.upsert({
        where: { messageId_userId_emoji: { messageId, userId, emoji } },
        update: {},
        create: { messageId, userId, emoji },
      });
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      io.to(`chat:${message.chatId}`).emit('reaction:new', reaction);
    });

    // ---------- تماس صوتی/تصویری (WebRTC signaling) ----------
    // جریان: caller -> call:invite -> callee ها زنگ می‌خورن
    // callee -> call:accept / call:decline
    // بعد از accept، دو طرف پیام‌های SDP/ICE رو رد و بدل می‌کنن تا اتصال peer-to-peer برقرار بشه
    socket.on('call:invite', async ({ chatId, callType }) => {
      const call = await prisma.call.create({
        data: { chatId, initiatorId: userId, type: callType, status: 'RINGING' },
      });
      socket.to(`chat:${chatId}`).emit('call:incoming', { call, from: userId });
    });

    socket.on('call:accept', ({ callId, chatId }) => {
      socket.to(`chat:${chatId}`).emit('call:accepted', { callId, by: userId });
    });

    socket.on('call:decline', async ({ callId, chatId }) => {
      await prisma.call.update({ where: { id: callId }, data: { status: 'DECLINED', endedAt: new Date() } });
      socket.to(`chat:${chatId}`).emit('call:declined', { callId, by: userId });
    });

    socket.on('call:end', async ({ callId, chatId }) => {
      await prisma.call.update({ where: { id: callId }, data: { status: 'ENDED', endedAt: new Date() } });
      socket.to(`chat:${chatId}`).emit('call:ended', { callId, by: userId });
    });

    // تبادل SDP offer/answer و ICE candidate بین دو طرف تماس
    socket.on('call:signal', ({ toUserId, signal }) => {
      io.to(`user:${toUserId}`).emit('call:signal', { fromUserId: userId, signal });
    });

    // ---------- قطع اتصال ----------
    socket.on('disconnect', async () => {
      removeSocket(userId, socket.id);
      if (!isOnline(userId)) {
        await prisma.user.update({ where: { id: userId }, data: { isOnline: false, lastSeenAt: new Date() } });
        broadcastPresence(io, userId, false);
      }
    });
  });
}

function broadcastPresence(io, userId, online) {
  io.emit('presence:update', { userId, online });
}

module.exports = { initSockets };
