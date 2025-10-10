const mongoose = require('mongoose');

const PatentSchema = new mongoose.Schema({
  applicationNumber: { type: String, required: true, unique: true },
  documentCode: String,
  documentCodeDescriptionText: String,
  category: String,
  file: String,
  mailroomDate: Date,
}, { timestamps: true });

module.exports = mongoose.model('Patent', PatentSchema);
