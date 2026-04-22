import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  imagePreview: {
    type: String, // base64 thumbnail
    default: ''
  },
  userAgent: {
    type: String,
    default: 'Unknown'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Result', resultSchema);
