const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');

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
