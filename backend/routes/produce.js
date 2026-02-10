const express = require('express');
const router = express.Router();
const Produce = require('../models/Produce');

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
router.get('/', async (req, res) => {
    try {
        const produce = await Produce.find().sort({ name: 1 });
        res.status(200).json(produce);
    } catch (error) {
        console.error('Error fetching produce:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
