
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadStats();
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
        document.getElementById('todaySales').textContent = '$0.00';
        document.getElementById('targetProgress').textContent = '0%';
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}
