const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  from: { type: String, required: true }, // Giả định userID là String
  to: { type: String, required: true },
  messageContent: {
    type: { type: String, enum: ['file', 'text'], required: true },
    text: { type: String, required: true } // Là nội dung chat hoặc đường dẫn file
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);