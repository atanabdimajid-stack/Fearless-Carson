const { Pool } = require('pg');

// Clean the connection string to remove sslmode=require, which causes a noisy security warning in pg v8+
const connectionString = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace('?sslmode=require', '') : '';

// Initialize the database connection pool using the secure environment variable
const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false // Required for some cloud providers like Neon
    }
});

// Function to initialize the table if it doesn't exist
const initDb = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER REFERENCES customers(id),
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                review_text TEXT NOT NULL,
                ai_response TEXT,
                status VARCHAR(50) DEFAULT 'unresponded',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                smtp_host VARCHAR(255),
                smtp_port VARCHAR(50),
                smtp_user VARCHAR(255),
                smtp_pass VARCHAR(255),
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Connected to Cloud PostgreSQL Database & Initialized Tables');
    } catch (err) {
        console.error('❌ Error initializing database table:', err);
    }
};

const getCustomers = async () => {
    const result = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
    return result.rows;
};

const addCustomer = async (name, email) => {
    const result = await pool.query(
        'INSERT INTO customers (name, email) VALUES ($1, $2) RETURNING *',
        [name, email]
    );
    return result.rows[0];
};

const updateCustomerStatus = async (id, status) => {
    await pool.query(
        'UPDATE customers SET status = $1, last_updated = CURRENT_TIMESTAMP WHERE id = $2',
        [status, id]
    );
};

const getCustomersByStatus = async (status) => {
    const result = await pool.query('SELECT * FROM customers WHERE status = $1', [status]);
    return result.rows;
};

// --- New Review Functions ---

const getReviews = async () => {
    const query = `
        SELECT r.*, c.name as customer_name 
        FROM reviews r 
        JOIN customers c ON r.customer_id = c.id 
        ORDER BY r.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
};

const addReview = async (customer_id, rating, review_text) => {
    const result = await pool.query(
        'INSERT INTO reviews (customer_id, rating, review_text) VALUES ($1, $2, $3) RETURNING *',
        [customer_id, rating, review_text]
    );
    // Mark customer as responded
    await updateCustomerStatus(customer_id, 'responded');
    return result.rows[0];
};

const saveAiResponse = async (review_id, ai_response) => {
    const result = await pool.query(
        'UPDATE reviews SET ai_response = $1, status = $2 WHERE id = $3 RETURNING *',
        [ai_response, 'responded', review_id]
    );
    return result.rows[0];
};

// --- Settings Functions ---

const getSettings = async () => {
    const result = await pool.query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
    return result.rows[0];
};

const saveSettings = async (smtp_host, smtp_port, smtp_user, smtp_pass) => {
    // Delete old settings and insert new to keep it clean (only need 1 row)
    await pool.query('DELETE FROM settings');
    const result = await pool.query(
        'INSERT INTO settings (smtp_host, smtp_port, smtp_user, smtp_pass) VALUES ($1, $2, $3, $4) RETURNING *',
        [smtp_host, smtp_port, smtp_user, smtp_pass]
    );
    return result.rows[0];
};

module.exports = {
    pool,
    initDb,
    getCustomers,
    addCustomer,
    updateCustomerStatus,
    getCustomersByStatus,
    getReviews,
    addReview,
    saveAiResponse,
    getSettings,
    saveSettings
};
