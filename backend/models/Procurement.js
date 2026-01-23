const mongoose = require('mongoose');

const procurementSchema = new mongoose.Schema({
  produce: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Produce',
    required: [true, 'Produce is required']
  },
  dealer: {
    name: {
      type: String,
      required: [true, 'Dealer name is required'],
      trim: true,
      maxlength: [100, 'Dealer name cannot exceed 100 characters']
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
      },
      address: {
        type: String,
        trim: true,
        maxlength: [200, 'Address cannot exceed 200 characters']
      }
    }
  },
  quantity: {
    tonnage: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.1, 'Quantity must be greater than 0']
    },
    unit: {
      type: String,
      enum: ['kg', 'ton', 'bag', 'crate'],
      default: 'kg'
    }
  },
  cost: {
    unitCost: {
      type: Number,
      required: [true, 'Unit cost is required'],
      min: [0, 'Unit cost cannot be negative']
    },
    totalCost: {
      type: Number,
      required: [true, 'Total cost is required'],
      min: [0, 'Total cost cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  quality: {
    grade: {
      type: String,
      enum: ['A', 'B', 'C', 'D'],
      default: 'A'
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Quality notes cannot exceed 500 characters']
    }
  },
  delivery: {
    date: {
      type: Date,
      required: [true, 'Delivery date is required'],
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'delivered', 'cancelled'],
      default: 'pending'
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch assignment is required']
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recorder is required']
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'completed'],
    default: 'active'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
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

// Calculate total cost before saving
procurementSchema.pre('save', function(next) {
  this.cost.totalCost = this.cost.unitCost * this.quantity.tonnage;
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Procurement', procurementSchema);