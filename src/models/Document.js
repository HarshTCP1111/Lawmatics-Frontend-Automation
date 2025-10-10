const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  applicationNumber: {
    type: String,
    required: true,
    index: true
  },
  documentCode: {
    type: String,
    required: true
  },
  officialDate: {
    type: Date,
    required: true
  },
  description: String,
  originalUrl: String,
  driveLink: String, // Google Drive URL
  driveFileId: String,
  uploadDate: {
    type: Date,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['Patent', 'Trademark'],
    required: true
  }
}, {
  timestamps: true
});

// Compound index to ensure uniqueness
documentSchema.index({ 
  applicationNumber: 1, 
  documentCode: 1, 
  officialDate: 1 
}, { unique: true });

module.exports = mongoose.model('Document', documentSchema);