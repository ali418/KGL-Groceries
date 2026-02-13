const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const CreditSale = require('../models/CreditSale');
const Produce = require('../models/Produce');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

/**
 * @swagger
 * tags:
 *   name: Sales
 *   description: Sales management (Cash and Credit)
 */

/**
 * @swagger
 * /sales/checkout:
 *   post:
 *     summary: Record a cash sale
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               produceName:
 *                 type: string
 *               tonnage:
 *                 type: number
 *               amountPaid:
 *                 type: number
 *               buyerName:
 *                 type: string
 *               salesAgentName:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               time:
 *                 type: string
 *     responses:
 *       201:
 *         description: Sale recorded successfully
 *       400:
 *         description: Validation error or insufficient stock
 *       500:
 *         description: Server error
 */
router.post('/checkout', protect, authorize('agent', 'manager'), async (req, res) => {
    try {
        // --- 1. Frontend Bulk Format ---
        if (req.body.items && Array.isArray(req.body.items)) {
            const { items, payment } = req.body;
            if (!items || items.length === 0) throw new Error('No items');
            
            const sales = [];
            
            // Process each item
            for (const item of items) {
                const produce = await Produce.findById(item.produceId);
                if (!produce) throw new Error(`Product not found: ${item.produceId}`);
                if (produce.currentStock.tonnage < Number(item.quantity)) {
                    throw new Error(`Insufficient stock for ${produce.name}`);
                }

                // Deduct
                produce.currentStock.tonnage -= Number(item.quantity);
                await produce.save();

                // Create Sale
                const sale = await Sale.create({
                    produce: produce._id,
                    quantity: { tonnage: Number(item.quantity), unit: produce.currentStock.unit || 'kg' },
                    pricing: { unitPrice: Number(item.unitPrice), totalPrice: Number(item.quantity) * Number(item.unitPrice) },
                    buyer: { name: payment.buyerName || 'Walk-in' },
                    payment: { amountPaid: Number(payment.amountPaid) / items.length, method: 'cash', status: 'paid' }, // Simplified
                    branch: req.user.branch,
                    salesAgent: req.user._id,
                    status: 'completed'
                });
                sales.push(sale);
            }
            return res.status(200).json({ success: true, data: sales, message: 'Checkout successful' });
        }

        // --- 2. Assignment Single Format ---
        const { produceName, tonnage, amountPaid, buyerName, salesAgentName, date, time } = req.body;

        // Validation
        if (!produceName || produceName.length < 2) return res.status(400).json({ error: 'Valid produce name required' });
        if (!tonnage || Number(tonnage) <= 0) return res.status(400).json({ error: 'Valid tonnage required' });
        if (!amountPaid || Number(amountPaid) < 10000) return res.status(400).json({ error: 'Amount paid must be at least 10,000 UGX (5 digits)' });
        if (!buyerName || buyerName.length < 2 || !buyerName.match(/^[a-zA-Z0-9\s]+$/)) return res.status(400).json({ error: 'Buyer name must be alphanumeric and at least 2 chars' });
        if (!salesAgentName || salesAgentName.length < 2 || !salesAgentName.match(/^[a-zA-Z0-9\s]+$/)) return res.status(400).json({ error: 'Sales Agent name must be alphanumeric and at least 2 chars' });
        
        // Find Produce
        const produce = await Produce.findOne({ name: produceName });
        if (!produce) return res.status(404).json({ error: 'Produce not found' });
        
        // Check Stock
        if (produce.currentStock.tonnage < Number(tonnage)) {
            return res.status(400).json({ error: `Insufficient stock. Available: ${produce.currentStock.tonnage}` });
        }

        // Deduct Stock
        produce.currentStock.tonnage -= Number(tonnage);
        await produce.save();

        // Record Sale
        const sale = await Sale.create({
            produce: produce._id,
            quantity: { tonnage: Number(tonnage), unit: 'kg' },
            pricing: { unitPrice: Number(amountPaid) / Number(tonnage), totalPrice: Number(amountPaid) },
            buyer: { name: buyerName },
            payment: { amountPaid: Number(amountPaid), method: 'cash', status: 'paid' },
            branch: req.user.branch, // Default to current user's branch
            salesAgent: req.user._id,
            status: 'completed',
            saleDate: date ? new Date(`${date}T${time}`) : Date.now()
        });

        res.status(201).json({ success: true, data: sale });

    } catch (error) {
        console.error('Cash sale error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

// POST /sales/credit - Record Credit/Deferred Sale
// Target: Trusted buyers only
// Fields: Buyer Name, NIN, Location, Contacts, Amount Due, Sales Agent Name, Due Date, Produce Name, Produce Type, Tonnage, Dispatch Date
router.post('/credit', protect, authorize('agent', 'manager'), async (req, res) => {
    try {
        const { 
            buyerName, nationalId, location, contact, 
            amountDue, salesAgentName, dueDate, 
            produceName, produceType, tonnage, dispatchDate 
        } = req.body;

        // --- Validation ---
        // Buyer Name: Alpha-numeric, min 2 chars
        if (!buyerName || buyerName.length < 2 || !buyerName.match(/^[a-zA-Z0-9\s]+$/)) {
            return res.status(400).json({ error: 'Buyer Name must be alphanumeric and at least 2 characters' });
        }
        // National ID (NIN): Valid NIN format (Assuming 13-14 alphanumeric chars for Uganda NIN usually, but generic alphanumeric checks here)
        if (!nationalId || !nationalId.match(/^[a-zA-Z0-9]{13,14}$/)) {
             // Relaxed check if exact format isn't specified, but usually alphanumeric
             if (!nationalId || nationalId.length < 5) return res.status(400).json({ error: 'Valid National ID (NIN) is required' });
        }
        // Location: Alpha-numeric, min 2 chars
        if (!location || location.length < 2 || !location.match(/^[a-zA-Z0-9\s]+$/)) {
            return res.status(400).json({ error: 'Location must be alphanumeric and at least 2 characters' });
        }
        // Contacts: Valid phone format
        if (!contact || !contact.match(/^\+?[\d\s\-\(\)]+$/)) {
            return res.status(400).json({ error: 'Valid contact number is required' });
        }
        // Amount Due: UgX, min 5 digits
        if (!amountDue || Number(amountDue) < 10000) {
            return res.status(400).json({ error: 'Amount Due must be at least 10,000 UGX (5 digits)' });
        }
        // Sales Agent Name: Alpha-numeric, min 2 chars (Should match logged in user ideally, but we validate input)
        if (!salesAgentName || salesAgentName.length < 2 || !salesAgentName.match(/^[a-zA-Z0-9\s]+$/)) {
            return res.status(400).json({ error: 'Sales Agent Name must be alphanumeric and at least 2 characters' });
        }
        // Produce Name/Type validation
        let produce;
        if (req.body.produceId) {
             produce = await Produce.findById(req.body.produceId);
             if (!produce) return res.status(404).json({ error: 'Produce not found by ID' });
             // Auto-fill names if missing (for record keeping)
             if (!produceName) req.body.produceName = produce.name;
             if (!produceType) req.body.produceType = produce.type;
        } else {
             if (!produceName) return res.status(400).json({ error: 'Produce Name is required' });
             // if (!produceType) return res.status(400).json({ error: 'Produce Type is required' }); // Relax if lookup by name works
             
             // Find Produce
             produce = await Produce.findOne({ name: produceName });
             if (!produce) return res.status(404).json({ error: 'Produce not found' });
        }
        
        // Check Stock
        if (produce.currentStock.tonnage < Number(tonnage)) {
            return res.status(400).json({ error: `Insufficient stock. Available: ${produce.currentStock.tonnage}` });
        }

        // Deduct Stock
        produce.currentStock.tonnage -= Number(tonnage);
        await produce.save();

        // Create Credit Sale Record
        const creditSale = await CreditSale.create({
            buyer: {
                name: buyerName,
                nationalId: nationalId,
                contact: { phone: contact },
                location: location
            },
            produce: produce._id,
            quantity: {
                tonnage: Number(tonnage),
                unit: 'kg'
            },
            pricing: {
                unitPrice: Number(amountDue) / Number(tonnage),
                totalAmount: Number(amountDue),
                currency: 'UGX'
            },
            creditTerms: {
                dueDate: new Date(dueDate),
                dispatchDate: new Date(dispatchDate)
            },
            branch: req.user.branch,
            salesAgent: req.user._id,
            status: 'active'
        });

        res.status(201).json({ success: true, data: creditSale, message: 'Credit sale recorded successfully' });

    } catch (error) {
        console.error('Credit sale error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

/**
 * @swagger
 * /sales:
 *   get:
 *     summary: List all sales
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of sales
 *       500:
 *         description: Server error
 */
router.get('/', protect, async (req, res) => {
    try {
        const sales = await Sale.find().populate('produce', 'name').sort({ createdAt: -1 });
        res.status(200).json(sales);
    } catch (error) {
        console.error('Get sales error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
