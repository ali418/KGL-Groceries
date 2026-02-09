const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Branch = require('./models/Branch');
const User = require('./models/User');
const Produce = require('./models/Produce');

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kgl-groceries', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await connectDB();

    console.log('🧹 Clearing existing data...');
    await Branch.deleteMany({});
    await User.deleteMany({});
    await Produce.deleteMany({});

    console.log('🏢 Creating Main Branch...');
    const mainBranch = await Branch.create({
      name: 'KGL Main Warehouse',
      location: 'Kampala, Uganda',
      code: 'KGL-HQ-01'
    });

    console.log('👥 Creating Users...');
    // Create Director
    const director = await User.create({
      name: 'Director User',
      username: 'director',
      password: 'password123',
      role: 'director',
      branch: mainBranch._id,
      contact: { phone: '+256 700000001', email: 'director@kgl.com' }
    });

    // Create Manager
    const manager = await User.create({
      name: 'Manager User',
      username: 'manager',
      password: 'password123',
      role: 'manager',
      branch: mainBranch._id,
      contact: { phone: '+256 700000002', email: 'manager@kgl.com' }
    });

    // Create Sales Agent
    const agent = await User.create({
      name: 'Sales Agent 1',
      username: 'agent',
      password: 'password123',
      role: 'agent',
      branch: mainBranch._id,
      contact: { phone: '+256 700000003', email: 'agent@kgl.com' }
    });

    // Assign manager to branch
    mainBranch.manager = manager._id;
    await mainBranch.save();

    console.log('🌾 Creating Initial Produce...');
    const produceItems = [
      { name: 'Maize', type: 'grains', tonnage: 50, cost: 500, salePrice: 700 },
      { name: 'Beans', type: 'vegetables', tonnage: 30, cost: 1200, salePrice: 1500 }, // 'Legumes' -> 'vegetables' or 'other'
      { name: 'Rice', type: 'grains', tonnage: 20, cost: 2500, salePrice: 3000 },
      { name: 'Sugar', type: 'other', tonnage: 100, cost: 3000, salePrice: 3500 }, // 'Processed' -> 'other'
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
        createdBy: manager._id,
        status: 'available'
      });
    }

    console.log('✅ Seeding completed successfully!');
    console.log('🔑 Credentials (Password: password123):');
    console.log('   Director: director');
    console.log('   Manager: manager');
    console.log('   Agent: agent');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedData();
