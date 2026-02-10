const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');

/**
 * @swagger
 * tags:
 *   name: Branches
 *   description: Branch management API
 */

/**
 * @swagger
 * /branches:
 *   get:
 *     summary: Get all branches
 *     tags: [Branches]
 *     responses:
 *       200:
 *         description: List of branches
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
 *                   code:
 *                     type: string
 *                   location:
 *                     type: string
 *       500:
 *         description: Server error
 */
// GET /api/branches
// Returns list of all branches
router.get('/', async (req, res) => {
    try {
        const branches = await Branch.find().select('name code location');
        res.status(200).json(branches);
    } catch (error) {
        console.error('Error fetching branches:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
