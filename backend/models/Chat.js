const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'bot'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text'
  },
  metadata: {
    confidence: Number,
    intent: String,
    entities: [String]
  }
}, {
  timestamps: true
});

const chatSchema = new mongoose.Schema({
  userId: {
    type: String,
    ref: 'User',
    required: false
  },
  sessionId: {
    type: String,
    required: true,
    default: () => uuidv4() // Generate UUID if not provided
  },
  messages: [messageSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  summary: String,
  userInfo: {
    browserInfo: String,
    ipAddress: String,
    userAgent: String
  }
}, {
  timestamps: true
});

chatSchema.index({ userId: 1, sessionId: 1 });
chatSchema.index({ sessionId: 1 });

module.exports = mongoose.model('Chat', chatSchema);
