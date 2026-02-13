const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  produce: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Produce',
    required: [true, 'Produce is required']
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
  pricing: {
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative']
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Total price cannot be negative']
    },
    discount: {
      type: Number,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%'],
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  buyer: {
    name: {
      type: String,
      required: [true, 'Buyer name is required'],
      trim: true,
      maxlength: [100, 'Buyer name cannot exceed 100 characters']
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
    },
    type: {
      type: String,
      enum: ['walk-in', 'regular', 'wholesale'],
      default: 'walk-in'
    }
  },
  payment: {
    method: {
      type: String,
      enum: ['cash', 'credit', 'transfer', 'check'],
      default: 'cash'
    },
    amountPaid: {
      type: Number,
      required: [true, 'Amount paid is required'],
      min: [0, 'Amount paid cannot be negative']
    },
    transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  status: {
      type: String,
      enum: ['paid', 'partial', 'pending'],
      default: 'paid'
    }
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch assignment is required']
  },
  salesAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sales agent is required']
  },
  status: {
    type: String,
    enum: ['completed', 'cancelled', 'refunded'],
    default: 'completed'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  saleDate: {
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

// Calculate total price before saving
saleSchema.pre('save', function(next) {
  this.pricing.totalPrice = (this.pricing.unitPrice * this.quantity.tonnage) * (1 - this.pricing.discount / 100);
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Sale', saleSchema);