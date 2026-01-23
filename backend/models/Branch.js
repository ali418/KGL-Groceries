const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Branch name is required'],
    trim: true,
    maxlength: [100, 'Branch name cannot exceed 100 characters']
  },
  location: {
    type: String,
    required: [true, 'Branch location is required'],
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters']
  },
  code: {
    type: String,
    required: [true, 'Branch code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [10, 'Branch code cannot exceed 10 characters']
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp
branchSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Branch', branchSchema);