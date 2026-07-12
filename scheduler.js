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
        // 1. Process 'pending' -> Send Check-in -> 'checkin_sent'
        // We send the check-in immediately upon adding the customer
        const pendingCustomers = await getCustomersByStatus('pending');
        for (const customer of pendingCustomers) {
            try {
                await sendEmail(
                    customer.email,
                    `Just checking in, ${customer.name}`,
                    `Hey ${customer.name}, this is ${clientName} from ${businessName}. Just checking in to make sure everything looks good with the work we did today.`
                );
                await updateCustomerStatus(customer.id, 'checkin_sent');
            } catch (err) {
                console.log(`[Scheduler] Skipping status update for ${customer.email} due to email failure.`);
            }
        }

        // 2. Process 'checkin_sent' -> Send Ask -> 'ask_sent'
        const checkinCustomers = await getCustomersByStatus('checkin_sent');
        for (const customer of checkinCustomers) {
            const lastUpdated = new Date(customer.last_updated);
            if (now - lastUpdated >= HOURS_2) { // Send 2 hours after check-in
                await sendEmail(
                    customer.email,
                    `Thank you from ${businessName}`,
                    `Hi ${customer.name}, ${clientName} here from ${businessName}. Just wanted to say thanks again for the opportunity to work with you. If you have 30 seconds, would you mind sharing your experience in a quick Google review? It helps other customers know they can trust us.\n\n${BASE_URL}/feedback.html?cid=${customer.id}`
                );
                await updateCustomerStatus(customer.id, 'ask_sent');
            }
        }

        // 3. Process 'ask_sent' -> Send Nudge -> 'nudge_sent'
        const askCustomers = await getCustomersByStatus('ask_sent');
        for (const customer of askCustomers) {
            const lastUpdated = new Date(customer.last_updated);
            if (now - lastUpdated >= DAYS_3) { // Send 3 days after ask
                await sendEmail(
                    customer.email,
                    `Following up regarding your review`,
                    `Just a quick follow-up. If you haven't had a chance yet, we'd really appreciate a quick Google review. It helps others know they can trust us.\n\n${BASE_URL}/feedback.html?cid=${customer.id}`
                );
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
