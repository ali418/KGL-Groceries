const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Produce = require('../models/Produce');
const Branch = require('../models/Branch');
const User = require('../models/User');

/**
 * @swagger
 * tags:
 *   name: Sales
 *   description: Sales management API
 */

/**
 * @swagger
 * /sales:
 *   get:
 *     summary: Get all sales
 *     tags: [Sales]
 *     responses:
 *       200:
 *         description: List of sales
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   produce:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                   salesAgent:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                   branch:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                   pricing:
 *                     type: object
 *                     properties:
 *                       totalPrice:
 *                         type: number
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create a new sale
 *     tags: [Sales]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - produceId
 *               - tonnage
 *               - unitPrice
 *             properties:
 *               produceId:
 *                 type: string
 *               tonnage:
 *                 type: number
 *               unitPrice:
 *                 type: number
 *               buyerName:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, mobile_money, bank_transfer]
 *               amountPaid:
 *                 type: number
 *               branchId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Sale recorded successfully
 *       400:
 *         description: Validation error or insufficient stock
 *       404:
 *         description: Produce not found
 *       500:
 *         description: Server error
 */
// GET /api/sales
// Returns list of all sales
router.get('/', async (req, res) => {
    try {
        const sales = await Sale.find()
            .populate('produce', 'name type')
            .populate('salesAgent', 'name')
            .populate('branch', 'name')
            .sort({ saleDate: -1 });
        res.status(200).json(sales);
    } catch (error) {
        console.error('Error fetching sales:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/sales
// Creates a new sale record and updates stock
router.post('/', async (req, res) => {
    try {
        const { produceId, tonnage, unitPrice, buyerName, paymentMethod, amountPaid, branchId, userId } = req.body;

        // Basic Validation
        if (!produceId || !tonnage || !unitPrice) {
            return res.status(400).json({ error: 'Produce, Tonnage, and Unit Price are required' });
        }

        // 1. Resolve Produce & Check Stock
        const produce = await Produce.findById(produceId);
        if (!produce) {
            return res.status(404).json({ error: 'Produce not found' });
        }

        if (produce.currentStock.tonnage < Number(tonnage)) {
            return res.status(400).json({ error: `Insufficient stock. Available: ${produce.currentStock.tonnage} tons` });
        }

        // 2. Resolve Branch & User (Default if missing - for Demo)
        let finalBranchId = branchId;
        let finalUserId = userId;

        if (!finalBranchId) {
            const b = await Branch.findOne();
            if (b) finalBranchId = b._id;
        }
        if (!finalUserId) {
            const u = await User.findOne({ role: 'agent' }) || await User.findOne({ role: 'manager' });
            if (u) finalUserId = u._id;
        }

        if (!finalBranchId || !finalUserId) {
             return res.status(500).json({ error: 'System configuration error: No Branch or Agent found.' });
        }

        // 3. Create Sale Record
        const sale = new Sale({
            produce: produce._id,
            quantity: {
                tonnage: Number(tonnage),
                unit: 'ton'
            },
            pricing: {
                unitPrice: Number(unitPrice),
                totalPrice: Number(unitPrice) * Number(tonnage), // Will be recalculated by pre-save hook
                currency: 'USD'
            },
            buyer: {
                name: buyerName || 'Walk-in Customer',
                contact: { phone: '', email: '' }
            },
            payment: {
                method: paymentMethod || 'cash',
                amountPaid: Number(amountPaid) || (Number(unitPrice) * Number(tonnage)),
                status: 'paid' // Simplified for now
            },
            branch: finalBranchId,
            salesAgent: finalUserId,
            status: 'completed'
        });

        await sale.save();

        // 4. Deduct Stock
        produce.currentStock.tonnage -= Number(tonnage);
        await produce.save();

        res.status(201).json({
            message: 'Sale recorded successfully',
            sale: sale,
            remainingStock: produce.currentStock.tonnage
        });

    } catch (error) {
        console.error('Sales Error:', error);
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
