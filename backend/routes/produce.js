const express = require('express');
const router = express.Router();
const Produce = require('../models/Produce');
const { protect } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Produce
 *   description: Produce management API
 */

/**
 * @swagger
 * /produce:
 *   get:
 *     summary: Get all produce
 *     tags: [Produce]
 *     responses:
 *       200:
 *         description: List of produce
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *                   currentStock:
 *                     type: object
 *                     properties:
 *                       tonnage:
 *                         type: number
 *       500:
 *         description: Server error
 */
// GET /api/produce
// Returns list of all produce with current stock
router.get('/', protect, async (req, res) => {
    try {
        const produce = await Produce.find()
            .populate('branch', 'name')
            .sort({ name: 1 });
        res.status(200).json(produce);
    } catch (error) {
        console.error('Error fetching produce:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/produce
// Create new produce item
router.post('/', protect, async (req, res) => {
    try {
        const {
            name,
            type,
            branch,
            unit,
            costPrice,
            salePrice,
            minimumStock,
            supplierName
        } = req.body;

        const newProduce = await Produce.create({
            name,
            type,
            branch,
            currentStock: {
                tonnage: 0,
                unit: unit || 'kg'
            },
            pricing: {
                costPrice,
                salePrice
            },
            thresholds: {
                minimumStock: minimumStock || 10
            },
            supplier: {
                name: supplierName
            },
            createdBy: req.user._id
        });

        res.status(201).json(newProduce);
    } catch (error) {
        console.error('Error creating produce:', error);
        res.status(400).json({ error: error.message });
    }
});

// PUT /api/produce/:id
// Update produce item
router.put('/:id', protect, async (req, res) => {
    try {
        const {
            name,
            type,
            branch,
            unit,
            costPrice,
            salePrice,
            minimumStock,
            supplierName
        } = req.body;

        const produce = await Produce.findById(req.params.id);

        if (!produce) {
            return res.status(404).json({ error: 'Produce not found' });
        }

        produce.name = name || produce.name;
        produce.type = type || produce.type;
        if (branch) produce.branch = branch;
        if (unit) produce.currentStock.unit = unit;
        if (costPrice) produce.pricing.costPrice = costPrice;
        if (salePrice) produce.pricing.salePrice = salePrice;
        if (minimumStock) produce.thresholds.minimumStock = minimumStock;
        if (supplierName) produce.supplier.name = supplierName;

        await produce.save();

        res.status(200).json(produce);
    } catch (error) {
        console.error('Error updating produce:', error);
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/produce/:id
// Delete produce item
router.delete('/:id', protect, async (req, res) => {
    try {
        const produce = await Produce.findById(req.params.id);

        if (!produce) {
            return res.status(404).json({ error: 'Produce not found' });
        }

        await produce.deleteOne();

        res.status(200).json({ message: 'Produce removed' });
    } catch (error) {
        console.error('Error deleting produce:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
