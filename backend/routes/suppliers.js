const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const { protect } = require('../middleware/auth');

// GET /api/suppliers - List all suppliers
router.get('/', protect, async (req, res) => {
    try {
        const suppliers = await Supplier.find().sort({ name: 1 });
        res.status(200).json({ success: true, data: suppliers });
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ success: false, message: 'Server error fetching suppliers' });
    }
});

// POST /api/suppliers - Create new supplier
router.post('/', protect, async (req, res) => {
    try {
        const { name, phone, email, address, contactPerson, specialization } = req.body;

        const existingSupplier = await Supplier.findOne({ name });
        if (existingSupplier) {
            return res.status(400).json({ success: false, message: 'Supplier already exists' });
        }

        const supplier = await Supplier.create({
            name,
            phone,
            email,
            address,
            contactPerson,
            specialization
        });

        res.status(201).json({ success: true, data: supplier, message: 'Supplier added successfully' });
    } catch (error) {
        console.error('Error creating supplier:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

module.exports = router;
