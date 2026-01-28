const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Path to the JSON data file
const DATA_FILE = path.join(__dirname, '../data.json');

// Helper to ensure data file exists
async function ensureDataFile() {
    try {
        await fs.access(DATA_FILE);
    } catch (error) {
        // File doesn't exist, create it with empty array
        await fs.writeFile(DATA_FILE, '[]', 'utf8');
    }
}

// GET /kgl/procurement
router.get('/', async (req, res) => {
    try {
        await ensureDataFile();
        const data = await fs.readFile(DATA_FILE, 'utf8');
        
        let records;
        try {
            records = JSON.parse(data);
        } catch (parseError) {
            // Handle corrupted JSON file
            records = [];
        }
        
        res.status(200).json(records);
    } catch (error) {
        console.error('Error reading procurement data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /kgl/procurement
router.post('/', async (req, res) => {
    try {
        // Basic validation
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: 'Bad Request: Request body is empty' });
        }

        await ensureDataFile();
        const data = await fs.readFile(DATA_FILE, 'utf8');
        
        let records = [];
        try {
            records = JSON.parse(data);
            if (!Array.isArray(records)) records = [];
        } catch (parseError) {
            records = [];
        }

        // Add timestamp and ID if not provided (optional enhancement)
        const newRecord = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            ...req.body
        };

        records.push(newRecord);

        await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2), 'utf8');

        res.status(201).json({
            message: 'Record created successfully',
            record: newRecord
        });
    } catch (error) {
        console.error('Error saving procurement data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
