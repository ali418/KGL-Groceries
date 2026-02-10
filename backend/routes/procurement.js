const express = require('express');
const router = express.Router();
const Procurement = require('../models/Procurement');
const Produce = require('../models/Produce');
const Branch = require('../models/Branch');
const User = require('../models/User');

/**
 * @swagger
 * tags:
 *   name: Procurement
 *   description: Procurement management API
 */

/**
 * @swagger
 * /kgl/procurement:
 *   get:
 *     summary: Get all procurements
 *     tags: [Procurement]
 *     responses:
 *       200:
 *         description: List of procurements
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
 *                   recordedBy:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                   branch:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                   cost:
 *                     type: object
 *                     properties:
 *                       totalCost:
 *                         type: number
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create a new procurement
 *     tags: [Procurement]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tonnage
 *               - cost
 *             properties:
 *               produceId:
 *                 type: string
 *               produceName:
 *                 type: string
 *               tonnage:
 *                 type: number
 *               cost:
 *                 type: number
 *               dealerName:
 *                 type: string
 *               branchId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Procurement record created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
// GET /kgl/procurement
// Returns list of all procurements
router.get('/', async (req, res) => {
    try {
        const procurements = await Procurement.find()
            .populate('produce', 'name type')
            .populate('recordedBy', 'name')
            .populate('branch', 'name')
            .sort({ createdAt: -1 });
        res.status(200).json(procurements);
    } catch (error) {
        console.error('Error fetching procurements:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /kgl/procurement
// Creates a new procurement record and updates stock
router.post('/', async (req, res) => {
    try {
        // "Smart" handler to support both strict ID and simple Capstone JSON
        let { produceId, produceName, tonnage, cost, dealerName, branchId, userId } = req.body;

        // Basic validation
        if (!tonnage || !cost) {
            return res.status(400).json({ error: 'Tonnage and Cost are required' });
        }

        // 1. Resolve Produce
        let produce;
        if (produceId) {
            produce = await Produce.findById(produceId);
        } else if (produceName) {
            produce = await Produce.findOne({ name: new RegExp('^' + produceName + '$', 'i') });
        }

        if (!produce) {
             return res.status(400).json({ error: `Produce '${produceName}' not found. Please create it first.` });
        }

        // 2. Resolve Branch & User (Default to first found if missing - for Demo/Capstone only)
        if (!branchId) {
            const b = await Branch.findOne();
            if (b) branchId = b._id;
        }
        if (!userId) {
            const u = await User.findOne({ role: 'manager' });
            if (u) userId = u._id;
        }

        if (!branchId || !userId) {
            return res.status(500).json({ error: 'System configuration error: No Branch or Manager found. Please run seed script.' });
        }

        // 3. Create Procurement
        const procurement = new Procurement({
            produce: produce._id,
            dealer: {
                name: dealerName || 'Unknown Dealer',
                contact: { phone: '', email: '', address: '' }
            },
            quantity: {
                tonnage: Number(tonnage),
                unit: 'ton'
            },
            cost: {
                unitCost: Number(cost) / Number(tonnage), // Assuming 'cost' input is total cost
                totalCost: Number(cost),
                currency: 'USD'
            },
            branch: branchId,
            recordedBy: userId,
            status: 'completed'
        });

        await procurement.save();

        // 4. Update Produce Stock
        produce.currentStock.tonnage = (produce.currentStock.tonnage || 0) + Number(tonnage);
        // Optional: Update Weighted Average Cost here if needed
        await produce.save();

        res.status(201).json({
            message: 'Procurement record created and stock updated successfully',
            record: procurement,
            newStock: produce.currentStock.tonnage
        });

    } catch (error) {
        console.error('Procurement Error:', error);
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
