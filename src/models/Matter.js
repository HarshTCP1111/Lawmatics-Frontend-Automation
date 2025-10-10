const mongoose = require('mongoose');

const MatterSchema = new mongoose.Schema({
  srNo: Number,
  matterType: String,
  applicationNumber: String,
  matterID: String,
  status: {
    type: String,
    enum: ['Pending Automation', 'Push for Automation', 'Automation Started', 'Automation Stopped'],
    default: 'Pending Automation'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Matter', MatterSchema);