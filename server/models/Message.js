const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true,
  },
  senderColor: {
    type: String,
    default: '#6366f1',
  },
  content: {
    type: String,
    required: true,
  },
  // Chat room ID is derived from sorted pair of userIds
  roomId: {
    type: String,
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Message', messageSchema);
