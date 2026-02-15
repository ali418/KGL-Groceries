
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadStats();
    
    // Logout listener for Sales Dashboard specifically if needed, 
    // but main.js should handle it if included. 
    // If main.js is NOT included in sales_dashboard.html (it is not currently based on my read), we need it here.
    const logoutLinks = document.querySelectorAll('a[href="login.html"]');
    logoutLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.replace('login.html');
        });
    });
});

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
    }
}

async function loadStats() {
    try {
        const response = await api.get('/sales/my-stats');
        document.getElementById('todaySales').textContent = formatCurrency(response.totalSalesToday || 0);
        document.getElementById('targetProgress').textContent = (response.targetProgress || 0) + '%';
    } catch (error) {
        console.error('Error loading stats:', error);
        document.getElementById('todaySales').textContent = formatCurrency(0);
        document.getElementById('targetProgress').textContent = '0%';
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        maximumFractionDigits: 0
    }).format(amount);
}
