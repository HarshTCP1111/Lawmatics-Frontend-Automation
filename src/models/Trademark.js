const mongoose = require('mongoose');

const TrademarkSchema = new mongoose.Schema({
  applicationNumber: { type: String, required: true, unique: true },
  description: String,
  file: String,
  mailroomDate: Date,
}, { timestamps: true });

module.exports = mongoose.model('Trademark', TrademarkSchema);
