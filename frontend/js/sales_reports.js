
// js/sales_reports.js

document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('reportDate');
    if (dateInput) dateInput.value = today;

    loadSummaryStats();
    loadSalesTrend();
    loadCategoryStats();
    loadDetailedSales();

    // Setup filters
    const filterInputs = ['reportDate', 'branchFilter', 'categoryFilter', 'paymentFilter'];
    filterInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                loadSummaryStats();
                loadSalesTrend();
                loadCategoryStats();
                loadDetailedSales();
            });
        }
    });
    
    // Setup export buttons
    const pdfBtn = Array.from(document.querySelectorAll('.btn-outline-secondary'))
        .find(b => b.textContent.trim().toLowerCase().includes('export pdf'));
    const excelBtn = Array.from(document.querySelectorAll('.btn-outline-success'))
        .find(b => b.textContent.trim().toLowerCase().includes('export excel'));
    if (pdfBtn) {
        pdfBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.print();
        });
    }
    if (excelBtn) {
        excelBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const date = document.getElementById('reportDate')?.value;
            const branch = document.getElementById('branchFilter')?.value;
            const category = document.getElementById('categoryFilter')?.value;
            const payment = document.getElementById('paymentFilter')?.value;
            let query = '?';
            if (date) query += `date=${date}&`;
            if (branch) query += `branch=${branch}&`;
            if (category) query += `category=${category}&`;
            if (payment) query += `payment=${payment}`;
            try {
                const sales = await api.get(`/reports/detailed${query}`);
                if (!sales || sales.length === 0) {
                    alert('No data to export for current filters.');
                    return;
                }
                const rows = sales.map(s => ({
                    date: new Date(s.saleDate).toLocaleString(),
                    product: s.produce ? s.produce.name : 'Unknown',
                    category: s.produce ? s.produce.type : '-',
                    quantity_kg: s.quantity || 0,
                    amount_ugx: s.amount || 0,
                    payment: s.paymentMethod || 'cash',
                    agent: s.agent ? s.agent.name : 'Unknown'
                }));
                // Reuse exporter from main.js if loaded
                if (typeof exportArrayToCSV === 'function') {
                    const dateStr = date || new Date().toISOString().split('T')[0];
                    const branchStr = branch || 'all';
                    exportArrayToCSV(rows, ['date','product','category','quantity_kg','amount_ugx','payment','agent'], `sales_report_${dateStr}_${branchStr}.csv`);
                } else {
                    // Fallback inline CSV
                    const headers = ['date','product','category','quantity_kg','amount_ugx','payment','agent'];
                    const csvRows = [headers.join(',')].concat(rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g,'""')}"`).join(',')));
                    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const dateStr = date || new Date().toISOString().split('T')[0];
                    const branchStr = branch || 'all';
                    a.download = `sales_report_${dateStr}_${branchStr}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                }
            } catch (err) {
                console.error('Export error:', err);
                alert('Failed to export data.');
            }
        });
    }
});

async function loadSummaryStats() {
    try {
        const date = document.getElementById('reportDate')?.value;
        const branch = document.getElementById('branchFilter')?.value;
        
        let query = '?';
        if (date) query += `date=${date}&`;
        if (branch) query += `branch=${branch}`;

        const stats = await api.get(`/reports/stats${query}`);
        
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
        // Clear previous chart if exists
        const chartStatus = Chart.getChart("salesTrendChart");
        if (chartStatus != undefined) {
            chartStatus.destroy();
        }

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
        
        const ctxCategory = document.getElementById('categoryChart').getContext('2d');
        // Clear previous chart if exists
        const chartStatus = Chart.getChart("categoryChart");
        if (chartStatus != undefined) {
            chartStatus.destroy();
        }

        new Chart(ctxCategory, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#2E7D32', '#43A047', '#66BB6A', '#81C784', '#A5D6A7']
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
        const date = document.getElementById('reportDate')?.value;
        const branch = document.getElementById('branchFilter')?.value;
        const category = document.getElementById('categoryFilter')?.value;
        const payment = document.getElementById('paymentFilter')?.value;

        let query = '?';
        if (date) query += `date=${date}&`;
        if (branch) query += `branch=${branch}&`;
        if (category) query += `category=${category}&`;
        if (payment) query += `payment=${payment}`;

        const sales = await api.get(`/reports/detailed${query}`);
        const tbody = document.getElementById('salesTableBody');
        tbody.innerHTML = '';
        
        if (sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No sales found for this criteria</td></tr>';
            return;
        }

        sales.forEach(sale => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(sale.saleDate).toLocaleDateString()} ${new Date(sale.saleDate).toLocaleTimeString()}</td>
                <td>${sale.produce ? sale.produce.name : 'Unknown'}</td>
                <td>${sale.produce ? sale.produce.type : '-'}</td>
                <td>${sale.quantity} kg</td>
                <td>${formatCurrency(sale.amount)}</td>
                <td><span class="badge bg-${sale.paymentMethod === 'cash' ? 'success' : 'warning'}">${sale.paymentMethod}</span></td>
                <td>${sale.agent ? sale.agent.name : 'Unknown'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error loading detailed sales:', error);
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', currencyDisplay: 'code' }).format(amount);
}
