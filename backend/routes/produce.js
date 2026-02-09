const express = require('express');
const router = express.Router();
const Produce = require('../models/Produce');

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
