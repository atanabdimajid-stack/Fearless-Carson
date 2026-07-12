const nodemailer = require('nodemailer');

// Configure the email transporter using Environment Variables
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const sendEmail = async (to, subject, text) => {
    // If credentials aren't set yet, fallback to mock logger so the app doesn't crash
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('\n[WARNING] Real email credentials not found in .env file!');
        console.log('✉️  MOCK EMAIL SENT');
        console.log(`To:      ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`------------------------------------------------------`);
        console.log(`${text}\n`);
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: `"Review Engine" <${process.env.SMTP_USER}>`,
            to: to,
            subject: subject,
            text: text
        });
        console.log(`✅ Email sent successfully to ${to} (${info.messageId})`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to send email to ${to}:`, error);
        throw error; // Throw to caller so status isn't updated falsely
    }
};

module.exports = {
    sendEmail
};
