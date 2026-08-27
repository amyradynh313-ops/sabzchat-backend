const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listChats, startDirectChat, createGroup, pinChat, muteChat } = require('../controllers/chats.controller');

router.use(requireAuth);

router.get('/', listChats);
router.post('/direct', startDirectChat);
router.post('/group', createGroup);
router.patch('/:chatId/pin', pinChat);
router.patch('/:chatId/mute', muteChat);

module.exports = router;
