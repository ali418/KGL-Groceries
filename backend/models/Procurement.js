const mongoose = require('mongoose');

const procurementSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true // e.g., PO-2024-001
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'Supplier is required']
  },
  items: [{
    produce: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Produce',
      required: true
    },
    produceName: String, // Snapshot in case produce is deleted
    quantity: {
      type: Number,
      required: true,
      min: 0.1
    },
    unit: {
      type: String,
      required: true
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0
    },
    totalCost: {
      type: Number,
      required: true
    }
  }],
  totalAmount: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'received', 'cancelled', 'overdue'],
    default: 'pending'
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  expectedDate: {
    type: Date
  },
  receivedDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Pre-save hook to generate Order ID if not present
procurementSchema.pre('save', async function(next) {
  if (!this.orderId) {
    const count = await this.constructor.countDocuments();
    const year = new Date().getFullYear();
    this.orderId = `PO-${year}-${(count + 1).toString().padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Procurement', procurementSchema);
