const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getMe, updateMe, searchUsers, addContact, listContacts } = require('../controllers/users.controller');

router.use(requireAuth);

router.get('/me', getMe);
router.put('/me', updateMe);
router.get('/search', searchUsers);
router.post('/contacts', addContact);
router.get('/contacts', listContacts);

module.exports = router;
