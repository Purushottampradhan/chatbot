const express = require('express');
const { getChatHistory, getAllChats } = require('../controllers/chatController');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/history/:userId/:sessionId', auth, getChatHistory);
router.get('/all', adminAuth, getAllChats);

module.exports = router;
