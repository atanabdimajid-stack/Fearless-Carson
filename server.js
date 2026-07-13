require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb, getCustomers, addCustomer, getReviews, addReview, saveAiResponse } = require('./database');
const { processQueue } = require('./scheduler');
const { generateReviewResponse } = require('./ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Cloud Database Table
initDb();

// --- Customer Routes ---
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

// --- Review Routes ---
app.get('/api/reviews', async (req, res) => {
    try {
        const reviews = await getReviews();
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mock endpoint to simulate a customer submitting a review, and also handles real public submissions
app.post('/api/reviews', async (req, res) => {
    const { customer_id, rating, review_text, customer_name } = req.body;
    
    if (!customer_id || !rating || !review_text) {
        return res.status(400).json({ error: 'Missing review data' });
    }

    try {
        // Fetch customer name if it wasn't provided (e.g. from the public feedback page)
        let finalCustomerName = customer_name;
        if (!finalCustomerName) {
            const result = await require('./database').pool.query('SELECT name FROM customers WHERE id = $1', [customer_id]);
            if (result.rows.length > 0) finalCustomerName = result.rows[0].name;
            else finalCustomerName = 'Valued Customer';
        }

        // 1. Save the initial review to database
        const review = await addReview(customer_id, rating, review_text);
        
        // 2. Generate personalized AI response asynchronously
        generateReviewResponse(finalCustomerName, review_text, rating)
            .then(async aiReply => {
                // 3. Save the generated AI response back to the database
                await saveAiResponse(review.id, aiReply);
                
                // 4. Send the AI response to the customer via email
                try {
                    const { pool } = require('./database');
                    const { sendEmail } = require('./mailer');
                    const result = await pool.query('SELECT email FROM customers WHERE id = $1', [customer_id]);
                    if (result.rows.length > 0) {
                        const customerEmail = result.rows[0].email;
                        const subject = 'Thank you for your review!';
                        const emailText = `${aiReply}\n\n- Mike from ABC Roofing`;
                        await sendEmail(customerEmail, subject, emailText);
                        console.log(`[AI Responder] Response emailed to ${customerEmail}`);
                    }
                } catch (emailErr) {
                    console.error('[AI Responder] Failed to send response email:', emailErr);
                }
            });

        res.status(201).json({ message: 'Review saved! AI is generating a response in the background.', review });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Settings Routes ---
const { getSettings, saveSettings } = require('./database');

app.get('/api/settings', async (req, res) => {
    try {
        const settings = await getSettings();
        res.json(settings || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', async (req, res) => {
    const { smtp_host, smtp_port, smtp_user, smtp_pass } = req.body;
    try {
        const settings = await saveSettings(smtp_host, smtp_port, smtp_user, smtp_pass);
        res.status(200).json(settings);
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
