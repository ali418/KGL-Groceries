
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadStats();
    loadRecentSales();
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
        document.getElementById('todaySales').textContent = formatCurrency(response.todaySales || 0);
        document.getElementById('targetProgress').textContent = (response.targetProgress || 0) + '%';
        
        // Update progress bar width
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = (response.targetProgress || 0) + '%';
            progressBar.setAttribute('aria-valuenow', response.targetProgress || 0);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        document.getElementById('todaySales').textContent = formatCurrency(0);
        document.getElementById('targetProgress').textContent = '0%';
    }
}

async function loadRecentSales() {
    try {
        // Fetch recent sales for the logged-in agent
        const sales = await api.get('/sales/my-history?limit=5');
        const tbody = document.getElementById('recentSalesTableBody');
        
        if (!tbody) return;

        if (!sales || sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No recent sales</td></tr>';
            return;
        }

        tbody.innerHTML = sales.map(sale => `
            <tr>
                <td>${new Date(sale.saleDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                <td>${sale.produce ? sale.produce.name : 'Unknown'}</td>
                <td>${sale.quantity?.tonnage || 0} ${sale.produce?.unit || 'kg'}</td>
                <td>${formatCurrency(sale.pricing?.totalPrice || 0)}</td>
                <td><span class="badge bg-${sale.payment?.method === 'cash' ? 'success' : 'info'}">${sale.payment?.method || 'cash'}</span></td>
                <td><span class="badge bg-success">Completed</span></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading recent sales:', error);
        const tbody = document.getElementById('recentSalesTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading sales</td></tr>';
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        currencyDisplay: 'code',
        maximumFractionDigits: 0
    }).format(amount);
}
