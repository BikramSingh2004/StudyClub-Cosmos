const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  createdBy: {
    type: String,
    required: true,
  },
  // Position on the 2D cosmos map
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  color: {
    type: String,
    default: '#6366f1',
  },
  maxMembers: {
    type: Number,
    default: 8,
  },
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
