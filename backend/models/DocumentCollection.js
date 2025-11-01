const mongoose = require('mongoose');

const documentCollectionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    ref: 'User',
    required: false
  },
  currentStep: {
    type: String,
    enum: ['pan', 'aadhar', 'email', 'phone', 'completed'],
    default: 'pan'
  },
  documents: {
    pan: {
      value: String,
      isVerified: { type: Boolean, default: false },
      attempts: { type: Number, default: 0 },
      lastAttempt: Date,
      verifiedAt: Date
    },
    aadhar: {
      value: String,
      isVerified: { type: Boolean, default: false },
      attempts: { type: Number, default: 0 },
      lastAttempt: Date,
      verifiedAt: Date
    },
    email: {
      value: String,
      isVerified: { type: Boolean, default: false },
      attempts: { type: Number, default: 0 },
      lastAttempt: Date,
      verifiedAt: Date
    },
    phone: {
      value: String,
      isVerified: { type: Boolean, default: false },
      attempts: { type: Number, default: 0 },
      lastAttempt: Date,
      verifiedAt: Date
    }
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: Date
}, {
  timestamps: true
});

documentCollectionSchema.index({ sessionId: 1, currentStep: 1 });

module.exports = mongoose.model('DocumentCollection', documentCollectionSchema);

