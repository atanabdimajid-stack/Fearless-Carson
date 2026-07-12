const urlParams = new URLSearchParams(window.location.search);
const customerId = urlParams.get('cid');

let selectedRating = 0;

// Handle Star Clicks
document.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', (e) => {
        selectedRating = parseInt(e.target.getAttribute('data-value'));
        
        // Remove active class from all
        document.querySelectorAll('.star').forEach(s => s.classList.remove('active'));
        
        // Add active class to clicked star
        e.target.classList.add('active');
        
        // Show text area
        document.getElementById('reviewBox').style.display = 'block';
    });
});

// Handle Submission
document.getElementById('submitBtn').addEventListener('click', async () => {
    const text = document.getElementById('reviewText').value;
    if (!text || selectedRating === 0) return alert('Please leave a rating and a comment.');

    const btn = document.getElementById('submitBtn');
    btn.innerText = 'Submitting...';
    btn.disabled = true;

    try {
        await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_id: customerId,
                rating: selectedRating,
                review_text: text
            })
        });

        // Hide Step 1 and 2
        document.getElementById('starContainer').style.display = 'none';
        document.getElementById('reviewBox').style.display = 'none';
        document.getElementById('greeting').style.display = 'none';
        document.querySelector('.subtitle').style.display = 'none';

        // Show Step 3
        document.getElementById('successBox').style.display = 'block';

    } catch (err) {
        console.error(err);
        alert('An error occurred. Please try again.');
        btn.innerText = 'Submit Feedback';
        btn.disabled = false;
    }
});

// Handle Google Redirect
document.getElementById('copyGoogleBtn').addEventListener('click', () => {
    const text = document.getElementById('reviewText').value;
    
    // Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
        // Redirect to Google Maps review link
        // In a real multi-tenant app, this link would come from the database per client.
        // For this agency model, you just hardcode the specific client's link here.
        window.location.href = "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4";
    }).catch(err => {
        console.error('Failed to copy', err);
        // Fallback redirect even if copy fails
        window.location.href = "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4";
    });
});
