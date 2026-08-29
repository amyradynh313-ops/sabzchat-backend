require('dotenv').config();
const path = require('path');
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');

const { initSockets } = require('./sockets');

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const chatsRoutes = require('./routes/chats.routes');
const messagesRoutes = require('./routes/messages.routes');
const storiesRoutes = require('./routes/stories.routes');
const telegramRoutes = require('./routes/telegram.routes');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || '*' },
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(process.env.UPLOAD_DIR || './uploads'));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/api/telegram', telegramRoutes);

initSockets(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🟢 سبزچت روی پورت ${PORT} در حال اجراست`);
});
