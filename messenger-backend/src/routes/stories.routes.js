const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { createStory, getStoriesFeed, viewStory } = require('../controllers/stories.controller');

router.use(requireAuth);

router.post('/', createStory);
router.get('/', getStoriesFeed);
router.post('/:storyId/view', viewStory);

module.exports = router;
