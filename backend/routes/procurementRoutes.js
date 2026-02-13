const express = require('express');
const router = express.Router();
const Procurement = require('../models/Procurement');
const Produce = require('../models/Produce');
const Supplier = require('../models/Supplier');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

/**
 * @swagger
 * tags:
 *   name: Procurement
 *   description: Procurement management
 */

/**
 * @swagger
 * /procurement:
 *   post:
 *     summary: Record produce bought (Procurement)
 *     tags: [Procurement]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - produceName
 *               - produceType
 *               - date
 *               - time
 *               - tonnage
 *               - cost
 *               - dealerName
 *               - contact
 *               - sellingPrice
 *             properties:
 *               produceName:
 *                 type: string
 *               produceType:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               time:
 *                 type: string
 *               tonnage:
 *                 type: number
 *               cost:
 *                 type: number
 *               dealerName:
 *                 type: string
 *               contact:
 *                 type: string
 *               sellingPrice:
 *                 type: number
 *     responses:
 *       201:
 *         description: Procurement recorded successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post('/', protect, authorize('manager', 'director'), async (req, res) => {
    try {
        // --- 1. Support for Frontend Format (Items Array) ---
        if (req.body.items && Array.isArray(req.body.items)) {
             const { supplierId, items, notes, expectedDate } = req.body;
             
             let totalAmount = 0;
             const processedItems = [];

             for (const item of items) {
                 const produce = await Produce.findById(item.produceId);
                 if (!produce) return res.status(400).json({ error: `Product not found: ${item.produceId}` });
                 
                 const itemTotal = Number(item.quantity) * Number(item.unitCost);
                 totalAmount += itemTotal;
                 processedItems.push({
                     produce: produce._id,
                     produceName: produce.name,
                     quantity: item.quantity,
                     unit: item.unit || produce.unit,
                     unitCost: item.unitCost,
                     totalCost: itemTotal
                 });

                 // Update stock immediately for frontend flow? 
                 // Old code did it in 'receive' endpoint, but let's check.
                 // Old code: POST / (pending) -> PUT /receive (update stock).
                 // We'll keep it as pending.
             }

             const order = await Procurement.create({
                 supplier: supplierId,
                 items: processedItems,
                 totalAmount,
                 notes,
                 expectedDate,
                 recordedBy: req.user._id,
                 status: 'pending'
             });

             return res.status(201).json({ success: true, data: order });
        }

        // --- 2. Support for Assignment Format (Flat Fields) ---
        const { 
            produceName, produceType, 
            date, time, 
            tonnage, cost, 
            dealerName, branch, contact, 
            sellingPrice 
        } = req.body;

        // Validation Rules
        if (!produceName || !produceName.match(/^[a-zA-Z0-9\s]+$/)) {
            return res.status(400).json({ error: 'Produce Name must be alphanumeric' });
        }
        if (!produceType || produceType.length < 2 || !produceType.match(/^[a-zA-Z\s]+$/)) {
            return res.status(400).json({ error: 'Produce Type must be alphabetic and at least 2 characters' });
        }
        if (!date) return res.status(400).json({ error: 'Date is required' });
        if (!time) return res.status(400).json({ error: 'Time is required' });
        
        if (!tonnage || Number(tonnage) < 100) {
            return res.status(400).json({ error: 'Tonnage must be at least 100 kg (3 digits)' });
        }
        if (!cost || Number(cost) < 10000) {
            return res.status(400).json({ error: 'Cost must be at least 10,000 UGX (5 digits)' });
        }
        if (!dealerName || dealerName.length < 2 || !dealerName.match(/^[a-zA-Z0-9\s]+$/)) {
            return res.status(400).json({ error: 'Dealer Name must be alphanumeric and at least 2 characters' });
        }
        if (!contact || !contact.match(/^\+?[\d\s\-\(\)]+$/)) {
            return res.status(400).json({ error: 'Valid contact number is required' });
        }
        if (!sellingPrice || Number(sellingPrice) <= 0) {
            return res.status(400).json({ error: 'Valid selling price is required' });
        }

        // Logic: Create Supplier if not exists
        let supplier = await Supplier.findOne({ name: dealerName });
        if (!supplier) {
            supplier = await Supplier.create({
                name: dealerName,
                contactPerson: dealerName, // Simplified
                phone: contact,
                specialization: produceType
            });
        }

        // Logic: Create/Update Produce
        let produce = await Produce.findOne({ name: produceName });
        if (!produce) {
            produce = await Produce.create({
                name: produceName,
                type: produceType,
                branch: req.user.branch,
                createdBy: req.user._id,
                currentStock: {
                    tonnage: 0,
                    unit: 'kg' // Default
                },
                pricing: {
                    salePrice: Number(sellingPrice),
                    costPrice: Number(cost) / Number(tonnage)
                }
            });
        } else {
            // Update pricing if needed
            produce.pricing.salePrice = Number(sellingPrice);
            produce.save();
        }

        // Create Procurement Record
        const procurement = await Procurement.create({
            supplier: supplier._id,
            items: [{
                produce: produce._id,
                produceName: produce.name,
                quantity: Number(tonnage),
                unit: 'kg',
                unitCost: Number(cost) / Number(tonnage),
                totalCost: Number(cost)
            }],
            totalAmount: Number(cost),
            status: 'received', // Auto-receive as per "stocking the produce" implication
            expectedDate: new Date(`${date}T${time}`),
            receivedDate: new Date(),
            recordedBy: req.user._id,
            branch: req.user.branch 
        });

        // Update Stock
        produce.currentStock.tonnage += Number(tonnage);
        await produce.save();

        res.status(201).json({
            success: true,
            data: procurement,
            message: 'Procurement recorded successfully'
        });

    } catch (error) {
        console.error('Procurement error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @swagger
 * /procurement:
 *   get:
 *     summary: List all procurement orders
 *     tags: [Procurement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of orders
 *       500:
 *         description: Server error
 */
router.get('/', protect, authorize('manager', 'director'), async (req, res) => {
    try {
        const orders = await Procurement.find()
            .populate('supplier', 'name contactPerson phone')
            .populate('items.produce', 'name unit')
            .populate('recordedBy', 'name')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @swagger
 * /procurement/{id}/receive:
 *   put:
 *     summary: Mark a procurement order as received and update stock
 *     tags: [Procurement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Procurement Order ID
 *     responses:
 *       200:
 *         description: Order received successfully
 *       400:
 *         description: Order already received or invalid
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.put('/:id/receive', protect, async (req, res) => {
    try {
        const order = await Procurement.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        if (order.status === 'received') return res.status(400).json({ success: false, message: 'Order already received' });

        for (const item of order.items) {
            const produce = await Produce.findById(item.produce);
            if (produce) {
                produce.currentStock.tonnage += item.quantity;
                await produce.save();
            }
        }

        order.status = 'received';
        order.receivedDate = Date.now();
        order.receivedBy = req.user._id;
        await order.save();

        res.status(200).json({ success: true, data: order, message: 'Order received' });
    } catch (error) {
        console.error('Receive order error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
