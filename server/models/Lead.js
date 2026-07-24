const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Lead name is required'],
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: [true, 'Lead email is required'],
    lowercase: true,
    trim: true,
    maxlength: 150
  },
  company: {
    type: String,
    default: '',
    trim: true,
    maxlength: 150
  },
  source: {
    type: String,
    default: 'web_form',
    trim: true,
    maxlength: 50
  },
  status: {
    type: String,
    enum: {
      values: ['new', 'contacted', 'qualified', 'won', 'lost'],
      message: 'Invalid lead status'
    },
    default: 'new'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Lead', leadSchema);
