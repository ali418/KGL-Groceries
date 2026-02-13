
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadDashboardData();
});

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
    }
}

async function loadDashboardData() {
    try {
        const response = await api.get('/reports/dashboard');
        
        // Update Key Metrics
        document.getElementById('todaySales').textContent = formatCurrency(response.todaySales || 0);
        document.getElementById('stockValue').textContent = formatCurrency(response.stockValue || 0);
        document.getElementById('lowStockCount').textContent = response.lowStockCount || 0;
        document.getElementById('totalCredit').textContent = formatCurrency(response.totalCredit || 0);

        // Update Recent Transactions
        renderRecentTransactions(response.recentTransactions);

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Show error state in cards if needed, or just leave as Loading...
    }
}

function renderRecentTransactions(transactions) {
    const tbody = document.getElementById('recentTransactionsBody');
    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No recent transactions</td></tr>';
        return;
    }

    tbody.innerHTML = transactions.map(tx => {
        const date = new Date(tx.saleDate).toLocaleString();
        const agentName = tx.salesAgent ? tx.salesAgent.name : 'Unknown';
        const amount = formatCurrency(tx.pricing.totalPrice);
        const paymentStatus = tx.payment.status === 'paid' 
            ? '<span class="badge bg-success">Paid</span>' 
            : '<span class="badge bg-warning text-dark">Pending</span>';
        
        // If multiple items (POS checkout), produce might not be populated or might be an array in future.
        // Currently Sale model has single produce per document, or my POS creates multiple documents.
        // My POS creates multiple Sale documents, one per item. So this is fine.
        
        return `
            <tr>
                <td><small class="text-muted">#${tx._id.slice(-6).toUpperCase()}</small></td>
                <td>${agentName}</td>
                <td>${amount}</td>
                <td>${paymentStatus}</td>
                <td><small>${date}</small></td>
            </tr>
        `;
    }).join('');
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}
