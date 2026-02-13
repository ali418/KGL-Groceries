
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadProducts();
    loadCreditSales();
    setupEventListeners();
});

let allProducts = [];

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
    }
}

async function loadProducts() {
    try {
        const products = await api.get('/produce');
        allProducts = products;
        const select = document.getElementById('productSelect');
        select.innerHTML = '<option value="">Select Product...</option>';
        
        products.forEach(p => {
            const option = document.createElement('option');
            option.value = p._id;
            option.textContent = `${p.name} (Stock: ${p.currentStock.tonnage} ${p.currentStock.unit})`;
            // Add data attribute for price reference if needed, though we let user enter price
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

async function loadCreditSales() {
    try {
        const sales = await api.get('/credit-sales');
        const tbody = document.getElementById('creditSalesTableBody');
        tbody.innerHTML = '';

        if (sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No credit sales found</td></tr>';
            return;
        }

        sales.forEach(sale => {
            const total = sale.pricing.totalAmount;
            const paid = sale.payments.reduce((acc, curr) => acc + curr.amount, 0);
            const balance = total - paid;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="fw-bold">${sale.buyer.name}</div>
                    <small class="text-muted">${sale.buyer.contact.phone}</small>
                </td>
                <td>${sale.produce ? sale.produce.name : 'Unknown'}</td>
                <td>${sale.quantity.tonnage} ${sale.quantity.unit}</td>
                <td>${formatCurrency(total)}</td>
                <td class="text-success">${formatCurrency(paid)}</td>
                <td class="text-danger fw-bold">${formatCurrency(balance)}</td>
                <td>${new Date(sale.creditTerms.dueDate).toLocaleDateString()}</td>
                <td>${getStatusBadge(sale.status)}</td>
                <td>
                    ${sale.status !== 'paid' ? `
                    <button class="btn btn-sm btn-outline-primary" onclick="openPaymentModal('${sale._id}')">
                        <i class="fas fa-money-bill-wave"></i> Pay
                    </button>
                    ` : '<i class="fas fa-check-circle text-success"></i>'}
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error loading credit sales:', error);
    }
}

function setupEventListeners() {
    document.getElementById('createCreditSaleBtn').addEventListener('click', createCreditSale);
    document.getElementById('submitPaymentBtn').addEventListener('click', submitPayment);
    
    // Auto-fill price when product selected
    document.getElementById('productSelect').addEventListener('change', (e) => {
        const productId = e.target.value;
        const product = allProducts.find(p => p._id === productId);
        if (product && product.pricing) {
            document.getElementById('unitPrice').value = product.pricing.salePrice || '';
        }
    });
}

async function createCreditSale() {
    const btn = document.getElementById('createCreditSaleBtn');
    
    const payload = {
        buyerName: document.getElementById('buyerName').value,
        phone: document.getElementById('buyerPhone').value,
        nationalId: document.getElementById('buyerNIN').value,
        produceId: document.getElementById('productSelect').value,
        quantity: document.getElementById('quantity').value,
        unitPrice: document.getElementById('unitPrice').value,
        dueDate: document.getElementById('dueDate').value,
        // Optional/Default fields
        tonnage: document.getElementById('quantity').value, // Mapping quantity to tonnage for backend
        email: '',
        address: '',
        location: ''
    };

    // Basic Validation
    if (!payload.buyerName || !payload.produceId || !payload.quantity || !payload.unitPrice || !payload.dueDate) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        btn.disabled = true;
        btn.textContent = 'Processing...';

        await api.post('/credit-sales', payload);
        
        alert('Credit Sale recorded successfully!');
        // Reset form
        document.getElementById('buyerName').value = '';
        document.getElementById('buyerPhone').value = '';
        document.getElementById('buyerNIN').value = '';
        document.getElementById('productSelect').value = '';
        document.getElementById('quantity').value = '';
        document.getElementById('unitPrice').value = '';
        document.getElementById('dueDate').value = '';
        
        loadCreditSales(); // Refresh table
        loadProducts(); // Refresh stock levels in dropdown
    } catch (error) {
        console.error('Error creating sale:', error);
        alert(error.message || 'Failed to create credit sale');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Record Credit Sale';
    }
}

function openPaymentModal(saleId) {
    document.getElementById('paymentSaleId').value = saleId;
    document.getElementById('paymentAmount').value = '';
    const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
    modal.show();
}

async function submitPayment() {
    const saleId = document.getElementById('paymentSaleId').value;
    const amount = document.getElementById('paymentAmount').value;
    const btn = document.getElementById('submitPaymentBtn');

    if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }

    try {
        btn.disabled = true;
        await api.post(`/credit-sales/${saleId}/pay`, { amount });
        
        // Close modal
        const modalEl = document.getElementById('paymentModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
        
        alert('Payment recorded successfully!');
        loadCreditSales();
    } catch (error) {
        console.error('Payment error:', error);
        alert(error.message || 'Failed to record payment');
    } finally {
        btn.disabled = false;
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(amount);
}

function getStatusBadge(status) {
    const badges = {
        'paid': 'bg-success',
        'partial': 'bg-info',
        'pending': 'bg-warning',
        'overdue': 'bg-danger'
    };
    return `<span class="badge ${badges[status] || 'bg-secondary'}">${status.toUpperCase()}</span>`;
}

// Expose functions to window for onclick handlers
window.openPaymentModal = openPaymentModal;
