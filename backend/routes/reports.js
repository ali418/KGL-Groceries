const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Produce = require('../models/Produce');
const CreditSale = require('../models/CreditSale');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

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
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Today's Sales (Cash & Paid portion of others)
        const todaySalesData = await Sale.find({
            saleDate: { $gte: today }
        });
        const todaySales = todaySalesData.reduce((acc, curr) => acc + (curr.payment?.amountPaid || 0), 0);

        // 2. Total Credit Outstanding
        // Calculate from CreditSale model (Formal credit sales)
        const creditSales = await CreditSale.find({ status: { $ne: 'paid' } });
        let totalCredit = creditSales.reduce((acc, curr) => {
            const paid = curr.payments.reduce((p, c) => p + c.amount, 0);
            return acc + (curr.pricing.totalAmount - paid);
        }, 0);

        // Also add credit from regular Sales (POS credit sales)
        const posCreditSales = await Sale.find({ 
            'payment.method': 'credit',
            'payment.status': { $ne: 'paid' }
        });
        
        const posCredit = posCreditSales.reduce((acc, curr) => {
            return acc + (curr.pricing.totalPrice - (curr.payment.amountPaid || 0));
        }, 0);

        totalCredit += posCredit;

        // 3. Stock Value & Low Stock
        const produce = await Produce.find();
        const stockValue = produce.reduce((acc, curr) => {
            return acc + ((curr.currentStock?.tonnage || 0) * (curr.pricing?.costPrice || 0));
        }, 0);
        
        const lowStockCount = produce.filter(p => (p.currentStock?.tonnage || 0) < (p.thresholds?.minimumStock || 5)).length;

        // 4. Recent Transactions (Last 5 Sales)
        const recentTransactions = await Sale.find()
            .sort({ saleDate: -1 })
            .limit(5)
            .populate('salesAgent', 'name')
            .populate('produce', 'name');

        res.status(200).json({
            todaySales,
            totalCredit,
            stockValue,
            lowStockCount,
            recentTransactions
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

/**
 * @swagger
 * /reports/stats:
 *   get:
 *     summary: Get detailed sales statistics
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales statistics
 *       500:
 *         description: Server error
 */
router.get('/stats', protect, authorize('manager', 'director'), async (req, res) => {
    try {
        const sales = await Sale.find();

        const totalRevenue = sales.reduce((acc, curr) => acc + (curr.payment?.amountPaid || 0), 0);
        
        const cashSales = sales
            .filter(s => s.payment?.method === 'cash')
            .reduce((acc, curr) => acc + (curr.payment?.amountPaid || 0), 0);
            
        const creditSales = sales
            .filter(s => s.payment?.method === 'credit' || s.payment?.status !== 'paid')
            .reduce((acc, curr) => {
                // For credit sales, we might want the total value of the sale, or just the outstanding amount?
                // The card says "Credit Sales", usually means the volume of sales made on credit.
                // Or "Outstanding Credit". 
                // Let's assume it means "Total Value of sales that were Credit" or "Outstanding".
                // In the HTML it says "Credit Sales ... 25% of total". This implies volume of credit transactions.
                if (s.payment?.method === 'credit') return acc + curr.pricing.totalPrice;
                return acc;
            }, 0);

        const transactionCount = sales.length;

        res.status(200).json({
            totalRevenue,
            cashSales,
            creditSales,
            transactionCount
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /reports/by-category:
 *   get:
 *     summary: Get sales by product category
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales by category
 *       500:
 *         description: Server error
 */
router.get('/by-category', protect, authorize('manager', 'director'), async (req, res) => {
    try {
        const sales = await Sale.find().populate('produce', 'type');
        
        const categoryStats = {};
        
        sales.forEach(sale => {
            if (sale.produce && sale.produce.type) {
                const type = sale.produce.type;
                if (!categoryStats[type]) categoryStats[type] = 0;
                categoryStats[type] += sale.payment?.amountPaid || 0;
            }
        });

        res.json(categoryStats);
    } catch (error) {
        console.error('Error fetching category stats:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
