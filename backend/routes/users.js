const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Branch = require('../models/Branch');
const bcrypt = require('bcryptjs');

// GET /api/users
// Returns list of all users
router.get('/', async (req, res) => {
    try {
        const users = await User.find()
            .populate('branch', 'name')
            .select('-password') // Exclude password
            .sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/users
// Create a new user
router.post('/', async (req, res) => {
    try {
        const { name, username, password, role, branchId, phone, email } = req.body;

        // Validation
        if (!name || !username || !password || !role || !branchId) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if username exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Check branch
        const branch = await Branch.findById(branchId);
        if (!branch) {
            return res.status(400).json({ error: 'Invalid Branch ID' });
        }

        const newUser = new User({
            name,
            username,
            password, // Pre-save hook will hash this
            role,
            branch: branchId,
            contact: { phone, email }
        });

        await newUser.save();

        res.status(201).json({
            message: 'User created successfully',
            user: {
                _id: newUser._id,
                name: newUser.name,
                username: newUser.username,
                role: newUser.role,
                branch: branch.name
            }
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/users/:id
// Update user
router.put('/:id', async (req, res) => {
    try {
        const { name, role, branchId, phone, email, status } = req.body;
        const userId = req.params.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (name) user.name = name;
        if (role) user.role = role;
        if (branchId) user.branch = branchId;
        if (phone) user.contact.phone = phone;
        if (email) user.contact.email = email;
        if (status) user.isActive = (status === 'active');

        await user.save();

        res.status(200).json({ message: 'User updated successfully', user });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/users/:id
// Soft delete (Deactivate)
router.delete('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.isActive = false;
        await user.save();

        res.status(200).json({ message: 'User deactivated successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
