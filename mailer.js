const nodemailer = require('nodemailer');
const dns = require('dns');
// Force IPv4 because Render free tier containers often fail to route IPv6 traffic to Google
dns.setDefaultResultOrder('ipv4first');

const { getSettings } = require('./database');

const sendEmail = async (to, subject, text) => {
    // 1. Try to fetch settings from database
    let host, port, user, pass;
    try {
        const dbSettings = await getSettings();
        if (dbSettings && dbSettings.smtp_user && dbSettings.smtp_pass) {
            host = dbSettings.smtp_host || 'smtp.gmail.com';
            port = dbSettings.smtp_port || 465;
            user = dbSettings.smtp_user;
            pass = dbSettings.smtp_pass;
        }
    } catch(err) {
        console.error('Failed to fetch settings from DB, falling back to ENV vars', err);
    }

    // 2. Fallback to Environment Variables
    if (!user || !pass) {
        host = process.env.SMTP_HOST || 'smtp.gmail.com';
        port = process.env.SMTP_PORT || 465;
        user = process.env.SMTP_USER;
        pass = process.env.SMTP_PASS;
    }

    // 3. Fallback to Mock Logger if nothing is configured
    if (!user || !pass) {
        console.log('\n[WARNING] Real email credentials not found in Settings or .env file!');
        console.log('✉️  MOCK EMAIL SENT');
        console.log(`To:      ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`------------------------------------------------------`);
        console.log(`${text}\n`);
        return true;
    }

    // 4. Create dynamic transporter
    const transporter = nodemailer.createTransport({
        host: host,
        port: port,
        secure: port == 465, // Use implicit TLS only for port 465
        auth: {
            user: user,
            pass: pass
        },
        family: 4, // STRICTLY force IPv4
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        const info = await transporter.sendMail({
            from: `"Review Engine" <${user}>`,
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
