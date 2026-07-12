const { Pool } = require('pg');

// Initialize the database connection pool using the secure environment variable
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
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
            )
        `);
        console.log('✅ Connected to Cloud PostgreSQL Database');
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

module.exports = {
    pool,
    initDb,
    getCustomers,
    addCustomer,
    updateCustomerStatus,
    getCustomersByStatus
};
