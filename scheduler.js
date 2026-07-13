const { getCustomersByStatus, updateCustomerStatus } = require('./database');
const { sendEmail } = require('./mailer');

// Real-world configuration (adjust these values based on business needs)
const HOURS_2 = 2 * 60 * 60 * 1000;
const DAYS_3 = 3 * 24 * 60 * 60 * 1000;

const businessName = process.env.BUSINESS_NAME || "ABC Roofing";
const clientName = process.env.CLIENT_NAME || "Mike";
const BASE_URL = process.env.BASE_URL || "https://review-engine-kdxn.onrender.com";

const processQueue = async () => {
    const now = new Date();
    console.log(`[Scheduler Webhook] Triggered at ${now.toISOString()}`);

    try {
        // 1. Process 'pending' -> Send Review Ask -> 'ask_sent'
        // We send the review ask immediately upon adding the customer
        const pendingCustomers = await getCustomersByStatus('pending');
        for (const customer of pendingCustomers) {
            try {
                await sendEmail(
                    customer.email,
                    `Thank you from ${businessName}`,
                    `Hi ${customer.name}, ${clientName} here from ${businessName}. Just checking in to make sure everything looks good with the work we did today.\n\nIf you have 30 seconds, would you mind sharing your experience in a quick Google review? It helps other customers know they can trust us.\n\n${BASE_URL}/feedback.html?cid=${customer.id}`
                );
                await updateCustomerStatus(customer.id, 'ask_sent');
            } catch (err) {
                console.log(`[Scheduler] Skipping status update for ${customer.email} due to email failure.`);
            }
        }

        // 2. Process 'ask_sent' -> Send Nudge -> 'nudge_sent'
        const askCustomers = await getCustomersByStatus('ask_sent');
        for (const customer of askCustomers) {
            const lastUpdated = new Date(customer.last_updated);
            if (now - lastUpdated >= DAYS_3) { // Send 3 days after ask
                await sendEmail(
                    customer.email,
                    `Following up regarding your review`,
                    `Just a quick follow-up. If you haven't had a chance yet, we'd really appreciate a quick Google review. It helps others know they can trust us.\n\n${BASE_URL}/feedback.html?cid=${customer.id}`
                );
                await updateCustomerStatus(customer.id, 'nudge_sent'); // Move to nudge_sent
            }
        }

        // 3. Process 'nudge_sent' -> 'completed' after some time (optional)
        const nudgeCustomers = await getCustomersByStatus('nudge_sent');
        for (const customer of nudgeCustomers) {
            const lastUpdated = new Date(customer.last_updated);
            if (now - lastUpdated >= DAYS_3) {
                await updateCustomerStatus(customer.id, 'completed'); // End of sequence
            }
        }

    } catch (error) {
        console.error('[Scheduler Webhook] Error processing queue:', error);
    }
};

module.exports = {
    processQueue
};
