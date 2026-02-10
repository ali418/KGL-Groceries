const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Produce = require('../models/Produce');
const CreditSale = require('../models/CreditSale');
const { protect, authorize } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Analytical reports and dashboard data
 */

/**
 * @swagger
 * /reports/dashboard:
 *   get:
 *     summary: Get dashboard key metrics
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalSales:
 *                   type: number
 *                 totalCredit:
 *                   type: number
 *                 totalStock:
 *                   type: number
 *                 lowStockCount:
 *                   type: number
 *       500:
 *         description: Server error
 */
router.get('/dashboard', protect, authorize('manager', 'director'), async (req, res) => {
    try {
        // 1. Total Sales (Cash)
        const sales = await Sale.find();
        const totalSales = sales.reduce((acc, curr) => acc + (curr.payment?.amountPaid || 0), 0);

        // 2. Total Credit Outstanding
        const creditSales = await CreditSale.find({ status: { $ne: 'paid' } });
        const totalCredit = creditSales.reduce((acc, curr) => {
            const paid = curr.payments.reduce((p, c) => p + c.amount, 0);
            return acc + (curr.pricing.totalAmount - paid);
        }, 0);

        // 3. Stock Overview
        const produce = await Produce.find();
        const totalStock = produce.reduce((acc, curr) => acc + (curr.currentStock?.tonnage || 0), 0);
        const lowStockCount = produce.filter(p => (p.currentStock?.tonnage || 0) < 5).length; // Threshold 5 tons

        res.status(200).json({
            totalSales,
            totalCredit,
            totalStock,
            lowStockCount
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /reports/sales-trend:
 *   get:
 *     summary: Get daily sales trend
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily sales data
 *       500:
 *         description: Server error
 */
router.get('/sales-trend', protect, authorize('manager', 'director'), async (req, res) => {
    try {
        const sales = await Sale.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$saleDate" } },
                    totalAmount: { $sum: "$payment.amountPaid" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json(sales);
    } catch (error) {
        console.error('Error fetching sales trend:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
