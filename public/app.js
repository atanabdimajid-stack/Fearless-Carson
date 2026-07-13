const API_CUSTOMERS = '/api/customers';
const API_REVIEWS = '/api/reviews';

// --- SPA Navigation ---
document.querySelectorAll('#navMenu a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active class from all links and sections
        document.querySelectorAll('#navMenu a').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
        
        // Add active class to clicked link and corresponding section
        link.classList.add('active');
        const targetId = link.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');

        // Fetch fresh data when switching tabs
        if (targetId === 'customers-view') fetchPipeline();
        if (targetId === 'reviews-view') fetchReviews();
        if (targetId === 'dashboard-view') fetchCustomers();
    });
});

// --- Data Fetching & Rendering ---

async function fetchCustomers() {
    try {
        const response = await fetch(API_CUSTOMERS);
        const customers = await response.json();
        
        // Update Dashboard Table
        const tbody = document.getElementById('dashboardBody');
        tbody.innerHTML = '';
        
        let activeCount = 0;
        let completedCount = 0;

        customers.forEach(c => {
            if (c.status === 'completed' || c.status === 'responded') completedCount++;
            else activeCount++;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${c.name}</strong></td>
                <td style="color: var(--text-muted)">${c.email}</td>
                <td><span class="status ${c.status}">${formatStatus(c.status)}</span></td>
                <td style="color: var(--text-muted)">${new Date(c.created_at).toLocaleString()}</td>
            `;
            tbody.appendChild(row);
        });

        // Update Stats
        document.getElementById('activeCount').innerText = activeCount;
        document.getElementById('completedCount').innerText = completedCount;
        document.getElementById('sentCount').innerText = (completedCount * 3) + activeCount; 

        // Update Review Modal Dropdown
        const select = document.getElementById('reviewCustomerSelect');
        select.innerHTML = customers.map(c => `<option value="${c.id}">${c.name} (${c.email})</option>`).join('');

    } catch (error) {
        console.error('Error fetching customers:', error);
    }
}

async function fetchPipeline() {
    try {
        const response = await fetch(API_CUSTOMERS);
        const customers = await response.json();
        
        const board = document.getElementById('pipelineBoard');
        
        const columns = [
            { id: 'pending', title: 'Pending (Wait)' },
            { id: 'ask_sent', title: 'Review Ask Sent' },
            { id: 'nudge_sent', title: 'Nudge Sent' },
            { id: 'responded', title: 'Responded / Reviewed' }
        ];

        board.innerHTML = columns.map(col => {
            const colCustomers = customers.filter(c => c.status === col.id || (col.id === 'nudge_sent' && c.status === 'completed'));
            return `
                <div class="pipeline-col">
                    <div class="col-header">
                        ${col.title} <span class="col-count">${colCustomers.length}</span>
                    </div>
                    <div class="col-body">
                        ${colCustomers.map(c => `
                            <div class="pipeline-card">
                                <strong>${c.name}</strong>
                                <span>${new Date(c.last_updated).toLocaleDateString()}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error fetching pipeline:', error);
    }
}

async function fetchReviews() {
    try {
        const response = await fetch(API_REVIEWS);
        const reviews = await response.json();
        
        const container = document.getElementById('reviewsContainer');
        
        if (reviews.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted);">No reviews yet. Simulate one to see the AI working!</p>`;
            return;
        }

        container.innerHTML = reviews.map(r => `
            <div class="review-card">
                <div class="review-header">
                    <strong>${r.customer_name}</strong>
                    <span class="review-rating">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
                </div>
                <div class="review-text">"${r.review_text}"</div>
                ${r.ai_response ? `
                    <div class="ai-response">
                        <span class="ai-badge">✨ AI Generated Response</span>
                        ${r.ai_response}
                    </div>
                ` : `
                    <div class="ai-response" style="background: rgba(245, 158, 11, 0.1); border-color: #fcd34d; color: #fcd34d;">
                        <span class="ai-badge" style="color: #fcd34d;">⏳ Generating...</span>
                        AI is currently writing a personalized response.
                    </div>
                `}
            </div>
        `).join('');

    } catch (error) {
        console.error('Error fetching reviews:', error);
    }
}

function formatStatus(status) {
    const map = {
        'pending': '⏳ Pending',
        'ask_sent': '⭐ Ask Sent',
        'nudge_sent': '🔔 Nudge Sent',
        'completed': '✅ Completed',
        'responded': '💖 Responded'
    };
    return map[status] || status;
}

// --- Modals ---
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    if (id === 'addModal') document.getElementById('addForm').reset();
    if (id === 'mockReviewModal') document.getElementById('mockReviewForm').reset();
}

// --- Forms ---
document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.innerText = 'Adding...'; submitBtn.disabled = true;

    try {
        await fetch(API_CUSTOMERS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: document.getElementById('custName').value,
                email: document.getElementById('custEmail').value
            })
        });
        closeModal('addModal');
        fetchCustomers();
    } finally {
        submitBtn.innerText = 'Start Sequence'; submitBtn.disabled = false;
    }
});

document.getElementById('mockReviewForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.innerText = 'Generating AI Reply...'; submitBtn.disabled = true;

    const select = document.getElementById('reviewCustomerSelect');
    
    try {
        await fetch(API_REVIEWS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_id: select.value,
                customer_name: select.options[select.selectedIndex].text.split(' (')[0],
                rating: document.getElementById('reviewRating').value,
                review_text: document.getElementById('reviewText').value
            })
        });
        closeModal('mockReviewModal');
        fetchReviews(); // Will show "Generating..."
        
        // Polling to see the AI response after it finishes in the background
        setTimeout(fetchReviews, 3000);
        setTimeout(fetchReviews, 6000);
    } finally {
        submitBtn.innerText = 'Submit Review'; submitBtn.disabled = false;
    }
});

// --- Settings Management ---
async function fetchSettings() {
    try {
        const res = await fetch('/api/settings');
        const settings = await res.json();
        if (settings.smtp_host) document.getElementById('smtpHost').value = settings.smtp_host;
        if (settings.smtp_port) document.getElementById('smtpPort').value = settings.smtp_port;
        if (settings.smtp_user) document.getElementById('smtpUser').value = settings.smtp_user;
        if (settings.smtp_pass) document.getElementById('smtpPass').value = settings.smtp_pass;
    } catch (error) {
        console.error('Error fetching settings:', error);
    }
}

document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
    const host = document.getElementById('smtpHost').value;
    const port = document.getElementById('smtpPort').value;
    const user = document.getElementById('smtpUser').value;
    const pass = document.getElementById('smtpPass').value;
    const btn = document.getElementById('saveSettingsBtn');
    
    btn.disabled = true;
    btn.innerText = 'Saving...';
    
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                smtp_host: host,
                smtp_port: port,
                smtp_user: user,
                smtp_pass: pass
            })
        });
        const msg = document.getElementById('settingsMsg');
        msg.style.display = 'block';
        setTimeout(() => msg.style.display = 'none', 3000);
    } catch (err) {
        alert('Failed to save settings');
    }
    btn.disabled = false;
    btn.innerText = 'Save Settings';
});

// Initial Fetch
fetchCustomers();
fetchReviews();
fetchSettings();
