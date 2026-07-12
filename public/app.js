const API_URL = '/api/customers';

// Fetch and display customers
async function fetchCustomers() {
    try {
        const response = await fetch(API_URL);
        const customers = await response.json();
        
        const tbody = document.getElementById('customersBody');
        tbody.innerHTML = '';
        
        let activeCount = 0;
        let completedCount = 0;

        customers.forEach(c => {
            if (c.status === 'completed') completedCount++;
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

        // Update stats
        document.getElementById('activeCount').innerText = activeCount;
        document.getElementById('completedCount').innerText = completedCount;
        // Mocking sent count based on active states for demo purposes
        document.getElementById('sentCount').innerText = (completedCount * 3) + activeCount; 

    } catch (error) {
        console.error('Error fetching customers:', error);
    }
}

// Format status nicely
function formatStatus(status) {
    const map = {
        'pending': '⏳ Pending',
        'checkin_sent': '✉️ Check-in Sent',
        'ask_sent': '⭐ Ask Sent',
        'nudge_sent': '🔔 Nudge Sent',
        'completed': '✅ Completed'
    };
    return map[status] || status;
}

// Modal Logic
function openModal() {
    document.getElementById('addModal').classList.add('active');
}

function closeModal() {
    document.getElementById('addModal').classList.remove('active');
    document.getElementById('addForm').reset();
}

// Form Submission
document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('custName').value;
    const email = document.getElementById('custEmail').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    submitBtn.innerText = 'Adding...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email })
        });
        
        if (response.ok) {
            closeModal();
            fetchCustomers();
        } else {
            alert('Error adding customer');
        }
    } catch (error) {
        console.error(error);
        alert('Failed to connect to server');
    } finally {
        submitBtn.innerText = 'Start Sequence';
        submitBtn.disabled = false;
    }
});

// Initial fetch and auto-refresh every 2 seconds to see the demo scheduler run live
fetchCustomers();
setInterval(fetchCustomers, 2000);
