const express = require('express');
const router = express.Router();
const CreditSale = require('../models/CreditSale');
const Produce = require('../models/Produce');
const { protect, authorize } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: CreditSales
 *   description: Credit sales management API
 */

/**
 * @swagger
 * /credit-sales:
 *   get:
 *     summary: Get all credit sales
 *     tags: [CreditSales]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of credit sales
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CreditSale'
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create a new credit sale
 *     tags: [CreditSales]
 *     security:
 *       - bearerAuth: []
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
 *               - buyerName
 *               - nationalId
 *               - phone
 *               - dueDate
 *             properties:
 *               produceId:
 *                 type: string
 *               tonnage:
 *                 type: number
 *               unitPrice:
 *                 type: number
 *               buyerName:
 *                 type: string
 *               nationalId:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Credit sale recorded successfully
 *       400:
 *         description: Validation error or insufficient stock
 *       500:
 *         description: Server error
 */
router.get('/', protect, authorize('manager', 'agent', 'director'), async (req, res) => {
    try {
        const creditSales = await CreditSale.find()
            .populate('produce', 'name type')
            .populate('salesAgent', 'name')
            .populate('branch', 'name')
            .sort({ createdAt: -1 });
        res.status(200).json(creditSales);
    } catch (error) {
        console.error('Error fetching credit sales:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/', protect, authorize('manager', 'agent'), async (req, res) => {
    try {
        const { 
            produceId, tonnage, unitPrice, 
            buyerName, nationalId, phone, email, address, location,
            dueDate 
        } = req.body;

        // Validation
        if (!produceId || !tonnage || !unitPrice || !buyerName || !nationalId || !phone || !dueDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check Stock
        const produce = await Produce.findById(produceId);
        if (!produce) {
            return res.status(404).json({ error: 'Produce not found' });
        }
        if (produce.currentStock.tonnage < Number(tonnage)) {
            return res.status(400).json({ error: `Insufficient stock. Available: ${produce.currentStock.tonnage}` });
        }

        // Create Credit Sale
        const creditSale = new CreditSale({
            produce: produceId,
            buyer: {
                name: buyerName,
                nationalId,
                contact: { phone, email, address },
                location
            },
            quantity: {
                tonnage: Number(tonnage),
                unit: 'ton'
            },
            pricing: {
                unitPrice: Number(unitPrice),
                totalAmount: Number(unitPrice) * Number(tonnage),
                currency: 'USD'
            },
            creditTerms: {
                dueDate: new Date(dueDate)
            },
            branch: req.user.branch,
            salesAgent: req.user._id,
            status: 'pending'
        });

        await creditSale.save();

        // Deduct Stock
        produce.currentStock.tonnage -= Number(tonnage);
        await produce.save();

        res.status(201).json({
            message: 'Credit sale recorded successfully',
            creditSale
        });

    } catch (error) {
        console.error('Error creating credit sale:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /credit-sales/{id}/pay:
 *   post:
 *     summary: Add a payment to a credit sale
 *     tags: [CreditSales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Payment recorded successfully
 *       404:
 *         description: Credit sale not found
 *       500:
 *         description: Server error
 */
router.post('/:id/pay', protect, authorize('manager', 'agent'), async (req, res) => {
    try {
        const { amount } = req.body;
        const sale = await CreditSale.findById(req.params.id);

        if (!sale) {
            return res.status(404).json({ error: 'Credit sale not found' });
        }

        sale.payments.push({
            amount: Number(amount),
            date: new Date(),
            recordedBy: req.user._id
        });

        // Recalculate status
        const totalPaid = sale.payments.reduce((acc, curr) => acc + curr.amount, 0);
        if (totalPaid >= sale.pricing.totalAmount) {
            sale.status = 'paid';
        } else if (totalPaid > 0) {
            sale.status = 'partial';
        }

        await sale.save();
        res.status(200).json({ message: 'Payment recorded', sale });

    } catch (error) {
        console.error('Error recording payment:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
