const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');
const User = require('../models/User');
const Produce = require('../models/Produce');

router.get('/', async (req, res) => {
  try {
    console.log('🌱 Starting database seed...');
    
    // Clear existing data
    await Branch.deleteMany({});
    await User.deleteMany({});
    await Produce.deleteMany({});
    console.log('🧹 Cleared existing data');

    // Create Main Branch
    const mainBranch = await Branch.create({
      name: 'KGL Main Warehouse',
      location: 'Kampala, Uganda',
      code: 'KGL-HQ-01'
    });
    console.log('🏢 Created Main Branch');

    // Create Users
    const users = [
      {
        name: 'Director User',
        username: 'director',
        password: 'password123',
        role: 'director',
        contact: { phone: '+256 700000001', email: 'director@kgl.com' }
      },
      {
        name: 'Manager User',
        username: 'manager',
        password: 'password123',
        role: 'manager',
        contact: { phone: '+256 700000002', email: 'manager@kgl.com' }
      },
      {
        name: 'Sales Agent 1',
        username: 'agent',
        password: 'password123',
        role: 'agent',
        contact: { phone: '+256 700000003', email: 'agent@kgl.com' }
      }
    ];

    const createdUsers = {};

    for (const u of users) {
      const user = await User.create({
        ...u,
        branch: mainBranch._id
      });
      createdUsers[u.role] = user;
      console.log(`👤 Created ${u.role}`);
    }

    // Assign manager to branch
    mainBranch.manager = createdUsers['manager']._id;
    await mainBranch.save();

    // Create Produce
    const produceItems = [
      { name: 'Maize', type: 'grains', tonnage: 50, cost: 500, salePrice: 700 },
      { name: 'Beans', type: 'vegetables', tonnage: 30, cost: 1200, salePrice: 1500 },
      { name: 'Rice', type: 'grains', tonnage: 20, cost: 2500, salePrice: 3000 },
      { name: 'Sugar', type: 'other', tonnage: 100, cost: 3000, salePrice: 3500 },
    ];

    for (const item of produceItems) {
      await Produce.create({
        name: item.name,
        type: item.type,
        currentStock: {
          tonnage: item.tonnage,
          unit: 'ton'
        },
        pricing: {
          costPrice: item.cost,
          salePrice: item.salePrice
        },
        branch: mainBranch._id,
        createdBy: createdUsers['manager']._id,
        status: 'available'
      });
    }
    console.log('🌾 Created Produce items');

    res.json({
      message: 'Database seeded successfully',
      credentials: {
        director: { username: 'director', password: 'password123' },
        manager: { username: 'manager', password: 'password123' },
        agent: { username: 'agent', password: 'password123' }
      }
    });

  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
