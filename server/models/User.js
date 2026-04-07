const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  avatarColor: {
    type: String,
    default: '#6366f1',
  },
  lastPosition: {
    x: { type: Number, default: 400 },
    y: { type: Number, default: 300 },
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
