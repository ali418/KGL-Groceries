const mongoose = require('mongoose');

const produceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Produce name is required'],
    trim: true,
    maxlength: [100, 'Produce name cannot exceed 100 characters']
  },
  type: {
    type: String,
    required: [true, 'Produce type is required'],
    trim: true,
    enum: {
      values: ['fruits', 'vegetables', 'grains', 'dairy', 'meat', 'other'],
      message: 'Type must be either fruits, vegetables, grains, dairy, meat, or other'
    }
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch assignment is required']
  },
  currentStock: {
    tonnage: {
      type: Number,
      required: [true, 'Current stock tonnage is required'],
      min: [0, 'Stock tonnage cannot be negative'],
      default: 0
    },
    unit: {
      type: String,
      enum: ['kg', 'ton', 'bag', 'crate', 'pieces', 'boxes', 'bunch', 'liter'],
      default: 'kg'
    }
  },
  pricing: {
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative']
    },
    salePrice: {
      type: Number,
      required: [true, 'Sale price is required'],
      min: [0, 'Sale price cannot be negative']
    },
    minimumPrice: {
      type: Number,
      min: [0, 'Minimum price cannot be negative']
    }
  },
  thresholds: {
    minimumStock: {
      type: Number,
      min: [0, 'Minimum stock cannot be negative'],
      default: 10
    },
    maximumStock: {
      type: Number,
      min: [0, 'Maximum stock cannot be negative']
    }
  },
  supplier: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Supplier name cannot exceed 100 characters']
    },
    contact: {
      phone: {
        type: String,
        trim: true
      },
      email: {
        type: String,
        trim: true,
        lowercase: true
      }
    }
  },
  status: {
    type: String,
    enum: ['available', 'low-stock', 'out-of-stock', 'discontinued'],
    default: 'available'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastRestocked: {
    type: Date,
    default: Date.now
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

// Update status based on stock level
produceSchema.pre('save', function(next) {
  if (this.currentStock.tonnage <= 0) {
    this.status = 'out-of-stock';
  } else if (this.currentStock.tonnage <= this.thresholds.minimumStock) {
    this.status = 'low-stock';
  } else {
    this.status = 'available';
  }
  this.updatedAt = Date.now();
  next();
});

// Method to update stock
produceSchema.methods.updateStock = function(quantity, operation = 'subtract') {
  if (operation === 'add') {
    this.currentStock.tonnage += quantity;
  } else {
    this.currentStock.tonnage -= quantity;
  }
  
  if (this.currentStock.tonnage < 0) {
    throw new Error('Insufficient stock');
  }
  
  return this.save();
};

module.exports = mongoose.model('Produce', produceSchema);