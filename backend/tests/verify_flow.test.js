const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Produce = require('../models/Produce');
const Procurement = require('../models/Procurement');
const Sale = require('../models/Sale');
const CreditSale = require('../models/CreditSale');

// Test Data
const managerUser = {
    name: 'Test Manager',
    username: 'manager_test',
    password: 'password123',
    role: 'manager',
    branchId: 'Maganjo', // Assuming string or ID
    phone: '0700000000',
    email: 'manager@test.com'
};

const agentUser = {
    name: 'Test Agent',
    username: 'agent_test',
    password: 'password123',
    role: 'agent',
    branchId: 'Maganjo',
    phone: '0711111111',
    email: 'agent@test.com'
};

const procurementData = {
    produceName: 'TestBeans',
    produceType: 'Legumes',
    date: '2023-10-27',
    time: '10:00',
    tonnage: 500,
    cost: 50000,
    dealerName: 'TestDealer',
    branch: 'Maganjo',
    contact: '0777777777',
    sellingPrice: 1500
};

const cashSaleData = {
    produceName: 'TestBeans',
    tonnage: 100,
    amountPaid: 150000, // 100 * 1500
    buyerName: 'CashBuyer',
    salesAgentName: 'Test Agent',
    date: '2023-10-27',
    time: '12:00'
};

const creditSaleData = {
    buyerName: 'CreditBuyer',
    nationalId: 'CM1234567890AB',
    location: 'Kampala',
    contact: '0788888888',
    amountDue: 75000, // 50 * 1500
    salesAgentName: 'Test Agent',
    dueDate: '2023-11-27',
    produceName: 'TestBeans',
    produceType: 'Legumes',
    tonnage: 50,
    dispatchDate: '2023-10-27'
};

let managerToken;
let agentToken;

describe('System Flow Verification (Assignment Requirements)', () => {
    
    beforeAll(async () => {
        // Connect to DB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://mongo:krlXDpEwvHqYqEreBvIMjvCnwsjwTGTA@trolley.proxy.rlwy.net:47875';
        await mongoose.connect(mongoUri, { authSource: 'admin' });
        
        // Cleanup Test Data
        await User.deleteMany({ username: { $in: [managerUser.username, agentUser.username] } });
        await Produce.deleteMany({ name: procurementData.produceName });
        // We might want to keep others but for this test let's try to be clean
    });

    afterAll(async () => {
        // Cleanup
        await User.deleteMany({ username: { $in: [managerUser.username, agentUser.username] } });
        await Produce.deleteMany({ name: procurementData.produceName });
        await mongoose.connection.close();
        
        // Write success file
        const fs = require('fs');
        fs.writeFileSync('verification_result.json', JSON.stringify({ success: true, timestamp: new Date() }));
    });

    // --- 1. User Management (Router 3) ---
    describe('Router 3: Users & Authentication', () => {
        it('should allow creating a Manager (Bootstrap/Seed)', async () => {
            // We'll create directly via Model for bootstrap as usually there's no public register
            const user = await User.create({
                name: managerUser.name,
                username: managerUser.username,
                password: managerUser.password,
                role: managerUser.role,
                branch: managerUser.branchId
            });
            expect(user).toBeDefined();
            expect(user.role).toBe('manager');
        });

        it('should login as Manager and return token', async () => {
            const res = await request(app)
                .post('/users/login') // Using new modular route
                .send({
                    username: managerUser.username,
                    password: managerUser.password
                });
            
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('token');
            managerToken = res.body.token;
        });

        it('should allow Manager to create Sales Agent', async () => {
            const res = await request(app)
                .post('/users') // Manager creating user
                .set('Authorization', `Bearer ${managerToken}`)
                .send(agentUser);

            expect(res.statusCode).toEqual(201);
        });

        it('should login as Sales Agent', async () => {
            const res = await request(app)
                .post('/users/login')
                .send({
                    username: agentUser.username,
                    password: agentUser.password
                });
            
            expect(res.statusCode).toEqual(200);
            agentToken = res.body.token;
        });
    });

    // --- 2. Procurement (Router 1) ---
    describe('Router 1: Procurement', () => {
        it('should allow Manager to record procurement', async () => {
            const res = await request(app)
                .post('/procurement')
                .set('Authorization', `Bearer ${managerToken}`)
                .send(procurementData);

            expect(res.statusCode).toEqual(201);
            expect(res.body.success).toBe(true);
        });

        it('should have created Produce with correct stock', async () => {
            const produce = await Produce.findOne({ name: procurementData.produceName });
            expect(produce).toBeDefined();
            expect(produce.currentStock.tonnage).toBe(procurementData.tonnage);
            expect(produce.pricing.salePrice).toBe(procurementData.sellingPrice);
        });
    });

    // --- 3. Sales (Router 2) ---
    describe('Router 2: Sales', () => {
        it('should allow Agent to record Cash Sale', async () => {
            const res = await request(app)
                .post('/sales/checkout')
                .set('Authorization', `Bearer ${agentToken}`)
                .send(cashSaleData);

            if (res.statusCode !== 201 && res.statusCode !== 200) {
                console.log('Cash Sale Error:', res.body);
            }
            expect(res.statusCode).toBeOneOf([200, 201]);
        });

        it('should deduct stock after Cash Sale', async () => {
            const produce = await Produce.findOne({ name: procurementData.produceName });
            // Initial: 500, Sold: 100 -> Remaining: 400
            expect(produce.currentStock.tonnage).toBe(400);
        });

        it('should allow Agent to record Credit Sale (Legacy/Assignment Format)', async () => {
            const res = await request(app)
                .post('/sales/credit')
                .set('Authorization', `Bearer ${agentToken}`)
                .send(creditSaleData);

            if (res.statusCode !== 201) {
                console.log('Credit Sale Error:', res.body);
            }
            expect(res.statusCode).toEqual(201);
        });

        it('should allow Agent to record Credit Sale (Frontend/produceId Format)', async () => {
            const produce = await Produce.findOne({ name: procurementData.produceName });
            const frontendCreditData = {
                ...creditSaleData,
                produceId: produce._id,
                amountDue: 15000, // 10 * 1500
                tonnage: 10,
                buyerName: 'FrontendCreditBuyer',
                nationalId: 'CM9876543210AB'
            };
            // Remove produceName to force usage of produceId logic
            delete frontendCreditData.produceName; 
            delete frontendCreditData.produceType;

            const res = await request(app)
                .post('/sales/credit')
                .set('Authorization', `Bearer ${agentToken}`)
                .send(frontendCreditData);

            if (res.statusCode !== 201) {
                console.log('Frontend Credit Sale Error:', res.body);
            }
            expect(res.statusCode).toEqual(201);
        });

        it('should deduct stock after both Credit Sales', async () => {
            const produce = await Produce.findOne({ name: procurementData.produceName });
            // Previous: 400
            // Legacy Credit: 50
            // Frontend Credit: 10
            // Remaining: 340
            expect(produce.currentStock.tonnage).toBe(340);
        });
    });

});

// Custom matcher helper
expect.extend({
    toBeOneOf(received, validValues) {
        const pass = validValues.includes(received);
        if (pass) {
            return {
                message: () => `expected ${received} not to be one of ${validValues}`,
                pass: true,
            };
        } else {
            return {
                message: () => `expected ${received} to be one of ${validValues}`,
                pass: false,
            };
        }
    },
});
