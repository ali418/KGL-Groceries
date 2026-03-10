document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || (user.role !== 'director' && user.role !== 'manager')) {
        window.location.href = 'login.html';
        return;
    }

    loadDashboardStats();
    
    const container = document.querySelector('.main-content .container-fluid');
    if (container) {
        const actions = document.createElement('div');
        actions.className = 'd-flex justify-content-end mb-3';
        actions.innerHTML = `
            <button class="btn btn-outline-secondary">
                <i class="fas fa-file-pdf me-2"></i> Export PDF
            </button>
        `;
        container.prepend(actions);
        const btn = actions.querySelector('button');
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.print();
        });
    }
});

async function loadDashboardStats() {
    try {
        const stats = await api.get('/reports/dashboard');
        
        // Update KPI Cards
        document.getElementById('todaySales').textContent = formatCurrency(stats.todaySales || 0);
        document.getElementById('stockValue').textContent = formatCurrency(stats.stockValue || 0);
        document.getElementById('totalCredit').textContent = formatCurrency(stats.totalCredit || 0);
        document.getElementById('lowStockCount').textContent = `${stats.lowStockCount || 0} Items`;

        // Update Recent Transactions Table if it exists
        const tbody = document.getElementById('recentTransactionsBody');
        if (tbody && stats.recentTransactions) {
            tbody.innerHTML = stats.recentTransactions.map(tx => `
                <tr>
                    <td>${new Date(tx.saleDate).toLocaleDateString()}</td>
                    <td>${tx.produce ? tx.produce.name : 'Unknown'}</td>
                    <td>${tx.salesAgent ? tx.salesAgent.name : 'System'}</td>
                    <td>${formatCurrency(tx.pricing?.totalPrice || 0)}</td>
                    <td><span class="badge bg-${tx.payment?.method === 'cash' ? 'success' : 'warning'}">${tx.payment?.method || 'cash'}</span></td>
                </tr>
            `).join('');
        }

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
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
