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
 * /reports/detailed:
 *   get:
 *     summary: Get detailed sales report with filtering
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *         description: Filter by date (YYYY-MM-DD)
 *       - in: query
 *         name: branch
 *         schema:
 *           type: string
 *         description: Filter by branch ID
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by product category
 *       - in: query
 *         name: payment
 *         schema:
 *           type: string
 *         description: Filter by payment method
 *     responses:
 *       200:
 *         description: List of sales
 *       500:
 *         description: Server error
 */
router.get('/detailed', protect, authorize('manager', 'director'), async (req, res) => {
    try {
        const { date, branch, category, payment } = req.query;
        
        let query = {};

        // Date Filter
        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            query.saleDate = { $gte: startDate, $lte: endDate };
        }

        // Branch Filter
        if (branch) {
            query.branch = branch;
        }

        // Payment Method Filter
        if (payment && payment !== 'all') {
            query['payment.method'] = payment;
        }

        // Category Filter needs to look up Produce IDs first
        if (category && category !== 'all') {
            const products = await Produce.find({ type: category }).select('_id');
            const productIds = products.map(p => p._id);
            query.produce = { $in: productIds };
        }

        const sales = await Sale.find(query)
            .populate('produce', 'name type')
            .populate('salesAgent', 'name')
            .populate('branch', 'name')
            .sort({ saleDate: -1 });

        // Transform for frontend
        const formattedSales = sales.map(sale => ({
            _id: sale._id,
            saleDate: sale.saleDate,
            produce: sale.produce,
            quantity: sale.quantity?.tonnage || 0,
            amount: sale.pricing?.totalPrice || 0,
            paymentMethod: sale.payment?.method || 'cash',
            agent: sale.salesAgent,
            branch: sale.branch,
            status: sale.status
        }));

        res.status(200).json(formattedSales);
    } catch (error) {
        console.error('Error fetching detailed report:', error);
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
        const stats = await Sale.aggregate([
            {
                $lookup: {
                    from: 'produces',
                    localField: 'produce',
                    foreignField: '_id',
                    as: 'produceDetails'
                }
            },
            { $unwind: '$produceDetails' },
            {
                $group: {
                    _id: '$produceDetails.type',
                    totalValue: { $sum: '$pricing.totalPrice' }
                }
            }
        ]);

        const result = {};
        stats.forEach(s => {
            result[s._id] = s.totalValue;
        });

        res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching category stats:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
