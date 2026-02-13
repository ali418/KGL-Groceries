
// js/sales_reports.js

document.addEventListener('DOMContentLoaded', () => {
    loadSummaryStats();
    loadSalesTrend();
    loadCategoryStats();
    loadDetailedSales();
    
    // Setup export buttons (mock functionality for now)
    const buttons = document.querySelectorAll('.btn-outline-secondary, .btn-outline-success');
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Export functionality will be implemented in the next update.');
        });
    });
});

async function loadSummaryStats() {
    try {
        const stats = await api.get('/reports/stats');
        
        // Update cards
        document.getElementById('totalSalesAmount').textContent = formatCurrency(stats.totalRevenue);
        document.getElementById('cashSalesAmount').textContent = formatCurrency(stats.cashSales);
        document.getElementById('creditSalesAmount').textContent = formatCurrency(stats.creditSales);
        document.getElementById('totalTransactions').textContent = stats.transactionCount;
        
        // Calculate percentages if needed (mock for now as backend sends raw numbers)
        // We could add logic here to compare with "last period" if we had that data.
        
    } catch (error) {
        console.error('Error loading summary stats:', error);
    }
}

async function loadSalesTrend() {
    try {
        const trendData = await api.get('/reports/sales-trend');
        
        const labels = trendData.map(d => d._id); // Date strings
        const data = trendData.map(d => d.totalAmount);
        
        const ctxTrend = document.getElementById('salesTrendChart').getContext('2d');
        new Chart(ctxTrend, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Daily Sales (UGX)',
                    data: data,
                    borderColor: '#2E7D32',
                    backgroundColor: 'rgba(46, 125, 50, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return 'UGX ' + (value / 1000).toFixed(0) + 'k';
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading sales trend:', error);
    }
}

async function loadCategoryStats() {
    try {
        const categoryData = await api.get('/reports/by-category');
        
        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);
        
        // Colors for chart
        const colors = ['#2E7D32', '#81C784', '#FFC107', '#E0E0E0', '#FF5722', '#03A9F4'];
        
        const ctxCategory = document.getElementById('categoryChart').getContext('2d');
        new Chart(ctxCategory, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length)
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    } catch (error) {
        console.error('Error loading category stats:', error);
    }
}

async function loadDetailedSales() {
    try {
        const sales = await api.get('/sales'); // This returns all sales
        const tbody = document.getElementById('salesTableBody');
        tbody.innerHTML = '';
        
        if (sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center">No sales records found</td></tr>';
            return;
        }
        
        // Limit to 50 for performance or pagination
        const displaySales = sales.slice(0, 50);
        
        displaySales.forEach(sale => {
            const tr = document.createElement('tr');
            
            const date = new Date(sale.saleDate).toLocaleString();
            const product = sale.produce ? sale.produce.name : 'Unknown Product';
            const branch = sale.branch ? sale.branch.name : 'Unknown Branch';
            const quantity = sale.quantity ? `${sale.quantity.tonnage} ${sale.quantity.unit}` : '-';
            const unitPrice = sale.pricing ? formatCurrency(sale.pricing.unitPrice) : '-';
            const total = sale.payment ? formatCurrency(sale.payment.amountPaid) : '-';
            const paymentMethod = sale.payment ? sale.payment.method : '-';
            const agent = sale.salesAgent ? sale.salesAgent.name : 'Unknown';
            const status = sale.status || 'completed';
            
            // Badges
            const methodBadge = paymentMethod === 'cash' ? 'bg-success' : 'bg-warning';
            const statusBadge = status === 'completed' ? 'bg-success' : 'bg-secondary';
            
            // Transaction ID extraction (from notes or ID)
            const trxId = sale.notes && sale.notes.includes('Transaction ID:') 
                ? sale.notes.split('Transaction ID:')[1].trim().substring(0, 8) + '...' 
                : sale._id.substring(0, 8);

            tr.innerHTML = `
                <td><strong>${trxId}</strong></td>
                <td>${date}</td>
                <td>${product}</td>
                <td>${branch}</td>
                <td>${quantity}</td>
                <td>${unitPrice}</td>
                <td>${total}</td>
                <td><span class="badge ${methodBadge}">${paymentMethod}</span></td>
                <td>${agent}</td>
                <td><span class="badge ${statusBadge}">${status}</span></td>
            `;
            tbody.appendChild(tr);
        });
        
        // Update badge count
        const badge = document.querySelector('.card-header .badge.bg-primary');
        if (badge) badge.textContent = `Showing ${displaySales.length} records`;
        
    } catch (error) {
        console.error('Error loading detailed sales:', error);
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(amount);
}
