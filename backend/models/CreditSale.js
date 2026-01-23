const mongoose = require('mongoose');

const creditSaleSchema = new mongoose.Schema({
  buyer: {
    name: {
      type: String,
      required: [true, 'Buyer name is required'],
      trim: true,
      maxlength: [100, 'Buyer name cannot exceed 100 characters']
    },
    nationalId: {
      type: String,
      required: [true, 'National ID is required'],
      trim: true,
      maxlength: [50, 'National ID cannot exceed 50 characters']
    },
    contact: {
      phone: {
        type: String,
        required: [true, 'Phone number is required'],
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
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters']
    },
    trustScore: {
      type: Number,
      min: [0, 'Trust score cannot be negative'],
      max: [100, 'Trust score cannot exceed 100'],
      default: 50
    }
  },
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
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  creditTerms: {
    dueDate: {
      type: Date,
      required: [true, 'Due date is required']
    },
    interestRate: {
      type: Number,
      min: [0, 'Interest rate cannot be negative'],
      max: [100, 'Interest rate cannot exceed 100%'],
      default: 0
    },
    gracePeriod: {
      type: Number,
      min: [0, 'Grace period cannot be negative'],
      default: 0
    }
  },
  payments: [{
    amount: {
      type: Number,
      required: true,
      min: [0, 'Payment amount cannot be negative']
    },
    date: {
      type: Date,
      default: Date.now
    },
    method: {
      type: String,
      enum: ['cash', 'transfer', 'check'],
      default: 'cash'
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [200, 'Payment notes cannot exceed 200 characters']
    }
  }],
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
    enum: ['active', 'paid', 'overdue', 'defaulted', 'cancelled'],
    default: 'active'
  },
  outstandingAmount: {
    type: Number,
    default: 0
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

// Calculate total amount and outstanding amount
 creditSaleSchema.pre('save', function(next) {
  this.pricing.totalAmount = this.pricing.unitPrice * this.quantity.tonnage;
  
  const totalPaid = this.payments.reduce((sum, payment) => sum + payment.amount, 0);
  this.outstandingAmount = this.pricing.totalAmount - totalPaid;
  
  // Update status based on payments and due date
  if (this.outstandingAmount <= 0) {
    this.status = 'paid';
  } else if (new Date() > this.creditTerms.dueDate) {
    this.status = 'overdue';
  }
  
  this.updatedAt = Date.now();
  next();
});

// Method to add payment
 creditSaleSchema.methods.addPayment = function(amount, method = 'cash', notes = '') {
  this.payments.push({
    amount,
    method,
    notes,
    date: new Date()
  });
  
  return this.save();
};

module.exports = mongoose.model('CreditSale', creditSaleSchema);