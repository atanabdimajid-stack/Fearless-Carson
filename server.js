require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb, getCustomers, addCustomer } = require('./database');
const { processQueue } = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Cloud Database Table
initDb();

// API Routes
app.get('/api/customers', async (req, res) => {
    try {
        const customers = await getCustomers();
        res.json(customers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/customers', async (req, res) => {
    const { name, email } = req.body;
    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
    }
    try {
        const customer = await addCustomer(name, email);
        res.status(201).json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CRON WEBHOOK
// Free tier external services (like cron-job.org) should hit this endpoint
// every 15 minutes to wake up the server and process the email queue
app.get('/api/cron', async (req, res) => {
    try {
        await processQueue();
        res.status(200).send('Queue processed successfully');
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Cloud Review Engine running on port ${PORT}`);
    console.log(`Webhook Endpoint available at: /api/cron`);
});
