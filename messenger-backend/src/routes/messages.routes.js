const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const upload = require('../config/upload');
const { getMessages, uploadMedia, reactToMessage, markAsRead } = require('../controllers/messages.controller');

router.use(requireAuth);

router.get('/:chatId', getMessages);
router.post('/upload', upload.single('file'), uploadMedia);
router.post('/:messageId/react', reactToMessage);
router.post('/:chatId/read', markAsRead);

module.exports = router;
