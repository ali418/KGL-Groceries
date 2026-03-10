document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadHistory();
});

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
    }
}

async function loadHistory() {
    try {
        const sales = await api.get('/sales/my-history');
        const tbody = document.getElementById('historyTableBody');
        
        if (!tbody) return;

        if (!sales || sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No history found</td></tr>';
            return;
        }

        tbody.innerHTML = sales.map(sale => `
            <tr>
                <td><strong>${sale.saleId || sale._id.substring(0, 8).toUpperCase()}</strong></td>
                <td>${new Date(sale.saleDate).toLocaleString()}</td>
                <td>${sale.produce ? sale.produce.name : 'Unknown'}</td>
                <td>${sale.quantity?.tonnage || 0} ${sale.produce?.unit || 'kg'}</td>
                <td>${formatCurrency(sale.pricing?.unitPrice || 0)}</td>
                <td><span class="fw-bold">${formatCurrency(sale.pricing?.totalPrice || 0)}</span></td>
                <td><span class="badge bg-${sale.payment?.method === 'cash' ? 'success' : 'info'}">${sale.payment?.method || 'cash'}</span></td>
                <td><span class="badge bg-success">Completed</span></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading history:', error);
        const tbody = document.getElementById('historyTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error loading history</td></tr>';
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
