// Procurement Management Logic

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    // Initialize
    loadSuppliers();
    loadOrders();
    loadProductsForDropdown(); // Pre-load products for the order modal
    initializeCharts();
    setupEventListeners();
});

// State
let products = [];
let suppliers = [];

// --- API Calls ---

async function loadSuppliers() {
    try {
        const response = await api.get('/suppliers');
        if (response.success) {
            suppliers = response.data;
            renderSuppliersTable(suppliers);
            updateSupplierStats(suppliers);
            populateSupplierDropdown(suppliers);
            
            const activeCountEl = document.getElementById('activeSuppliersCount');
            if (activeCountEl) activeCountEl.textContent = suppliers.length;
        }
    } catch (error) {
        console.error('Error loading suppliers:', error);
        showAlert('Failed to load suppliers', 'danger');
    }
}

async function loadOrders() {
    try {
        const response = await api.get('/procurement');
        if (response.success) {
            renderOrdersTable(response.data);
            updateOrderStats(response.data);
            
            const orders = response.data;
            const pendingCount = orders.filter(o => o.status === 'pending').length;
            const completedCount = orders.filter(o => o.status === 'received').length;
            
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const totalMonth = orders
                .filter(o => new Date(o.orderDate) >= startOfMonth)
                .reduce((acc, curr) => acc + curr.totalAmount, 0);

            const safeSetText = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val;
            };

            safeSetText('pendingOrdersCount', pendingCount);
            safeSetText('completedOrdersCount', completedCount);
            safeSetText('totalProcurementMonth', formatCurrency(totalMonth));
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        showAlert('Failed to load orders', 'danger');
    }
}

async function loadProductsForDropdown() {
    try {
        const response = await api.get('/produce');
        // Handle array response (legacy) or object response
        if (Array.isArray(response)) {
            products = response;
        } else if (response.success && Array.isArray(response.data)) {
            products = response.data;
        } else {
            products = [];
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// --- Rendering ---

function renderSuppliersTable(suppliersList) {
    const tbody = document.getElementById('suppliersTableBody');
    if (!tbody) return;

    if (suppliersList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No suppliers found</td></tr>';
        return;
    }

    tbody.innerHTML = suppliersList.map(supplier => `
        <tr>
            <td>
                <div class="d-flex align-items-center">
                    <div class="bg-light rounded-circle p-2 me-2">
                        <i class="fas fa-building text-primary"></i>
                    </div>
                    <strong>${supplier.name}</strong>
                </div>
            </td>
            <td>${supplier.contactPerson || '-'}</td>
            <td>${supplier.phone}</td>
            <td>${supplier.email || '-'}</td>
            <td>${supplier.specialization || 'General'}</td>
            <td>
                <div class="text-warning">
                    ${renderStars(supplier.rating || 0)}
                    <small class="text-muted ms-1">${supplier.rating || 'N/A'}</small>
                </div>
            </td>
            <td><span class="badge bg-success">Active</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning me-1" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-success" title="Order" onclick="openOrderModal('${supplier._id}')">
                    <i class="fas fa-shopping-cart"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) stars += '<i class="fas fa-star"></i>';
        else if (i - 0.5 <= rating) stars += '<i class="fas fa-star-half-alt"></i>';
        else stars += '<i class="far fa-star"></i>';
    }
    return stars;
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById('pendingOrdersTableBody');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No pending orders</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => `
        <tr>
            <td><strong>${order.orderNumber || order._id.substring(0, 8).toUpperCase()}</strong></td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="bg-light rounded-circle p-2 me-2">
                        <i class="fas fa-building text-primary"></i>
                    </div>
                    <strong>${order.supplier ? order.supplier.name : 'Unknown'}</strong>
                </div>
            </td>
            <td>${order.items ? order.items.length : 0} items</td>
            <td><span class="fw-bold">${formatCurrency(order.totalAmount)}</span></td>
            <td>${new Date(order.orderDate).toLocaleDateString()}</td>
            <td><span class="text-warning">${new Date(order.expectedDate).toLocaleDateString()}</span></td>
            <td><span class="badge bg-${getStatusColor(order.status)}">${order.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                ${order.status !== 'received' ? `
                <button class="btn btn-sm btn-outline-success me-1" title="Receive" onclick="receiveOrder('${order._id}')">
                    <i class="fas fa-check"></i>
                </button>` : ''}
                <button class="btn btn-sm btn-outline-warning" title="Contact">
                    <i class="fas fa-phone"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function getStatusColor(status) {
    switch (status) {
        case 'pending': return 'warning';
        case 'received': return 'success';
        case 'cancelled': return 'danger';
        default: return 'secondary';
    }
}

function populateSupplierDropdown(suppliersList) {
    const select = document.getElementById('orderSupplier');
    if (!select) return;
    
    // Keep first option
    const firstOption = select.options[0];
    select.innerHTML = '';
    select.appendChild(firstOption);

    suppliersList.forEach(supplier => {
        const option = document.createElement('option');
        option.value = supplier._id;
        option.textContent = supplier.name;
        select.appendChild(option);
    });
}

// --- Actions ---

function setupEventListeners() {
    // Add Supplier
    document.getElementById('saveSupplierBtn').addEventListener('click', async () => {
        const name = document.getElementById('supplierName').value;
        const contact = document.getElementById('supplierContact').value;
        const phone = document.getElementById('supplierPhone').value;
        const email = document.getElementById('supplierEmail').value;
        const address = document.getElementById('supplierAddress').value;
        const specialization = document.getElementById('supplierSpecialization').value;

        if (!name || !phone) {
            showAlert('Name and Phone are required', 'warning');
            return;
        }

        try {
            const response = await api.post('/suppliers', {
                name, contactPerson: contact, phone, email, address, specialization
            });
            if (response.success) {
                showAlert('Supplier added successfully', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('addSupplierModal'));
                modal.hide();
                document.getElementById('addSupplierForm').reset();
                loadSuppliers();
            } else {
                showAlert(response.message, 'danger');
            }
        } catch (error) {
            console.error('Error adding supplier:', error);
            showAlert('Failed to add supplier', 'danger');
        }
    });

    // Add Order Item Row
    document.getElementById('addOrderItemBtn').addEventListener('click', addOrderItemRow);

    // Create Order
    document.getElementById('createOrderBtn').addEventListener('click', async () => {
        const supplierId = document.getElementById('orderSupplier').value;
        const expectedDate = document.getElementById('orderExpectedDate').value;
        const notes = document.getElementById('orderNotes').value;

        if (!supplierId) {
            showAlert('Please select a supplier', 'warning');
            return;
        }

        const items = [];
        const rows = document.querySelectorAll('#orderItemsTableBody tr');
        let valid = true;

        rows.forEach(row => {
            const produceId = row.querySelector('.item-select').value;
            const quantity = row.querySelector('.item-qty').value;
            const unitCost = row.querySelector('.item-cost').value;
            const unit = row.querySelector('.item-unit') ? row.querySelector('.item-unit').value : 'kg';

            if (!produceId || !quantity || !unitCost) {
                valid = false;
                return;
            }

            items.push({
                produceId,
                quantity: parseFloat(quantity),
                unitCost: parseFloat(unitCost),
                unit
            });
        });

        if (!valid || items.length === 0) {
            showAlert('Please fill in all item details', 'warning');
            return;
        }

        try {
            const response = await api.post('/procurement', {
                supplierId, items, notes, expectedDate
            });
            if (response.success) {
                showAlert('Order created successfully', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('createOrderModal'));
                modal.hide();
                document.getElementById('createOrderForm').reset();
                document.getElementById('orderItemsTableBody').innerHTML = ''; // Clear items
                loadOrders();
            } else {
                showAlert(response.message, 'danger');
            }
        } catch (error) {
            console.error('Error creating order:', error);
            showAlert('Failed to create order', 'danger');
        }
    });
}

function addOrderItemRow() {
    const tbody = document.getElementById('orderItemsTableBody');
    const tr = document.createElement('tr');
    
    let productOptions = '<option value="">Select Product...</option>';
    products.forEach(p => {
        productOptions += `<option value="${p._id}" data-unit="${p.currentStock ? p.currentStock.unit : 'kg'}">${p.name} (${p.currentStock ? p.currentStock.unit : 'kg'})</option>`;
    });

    tr.innerHTML = `
        <td>
            <select class="form-select item-select" required onchange="updateRowUnit(this)">
                ${productOptions}
            </select>
        </td>
        <td>
            <input type="number" class="form-control item-qty" placeholder="0" min="1" required oninput="calculateRowTotal(this)">
        </td>
        <td>
            <input type="text" class="form-control item-unit" value="kg" readonly>
        </td>
        <td>
            <input type="number" class="form-control item-cost" placeholder="0.00" min="0" required oninput="calculateRowTotal(this)">
        </td>
        <td>
            <span class="fw-bold item-total">0.00</span>
        </td>
        <td>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove()">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    tbody.appendChild(tr);
}

// Helpers for dynamic rows
window.updateRowUnit = function(select) {
    const option = select.options[select.selectedIndex];
    const unit = option.getAttribute('data-unit') || 'kg';
    const row = select.closest('tr');
    row.querySelector('.item-unit').value = unit;
};

window.calculateRowTotal = function(input) {
    const row = input.closest('tr');
    const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
    const cost = parseFloat(row.querySelector('.item-cost').value) || 0;
    row.querySelector('.item-total').textContent = (qty * cost).toFixed(2);
};

window.receiveOrder = async function(orderId) {
    if (!confirm('Are you sure you want to mark this order as received? This will update stock levels.')) return;

    try {
        const response = await api.put(`/procurement/${orderId}/receive`, {});
        if (response.success) {
            showAlert('Order received and stock updated', 'success');
            loadOrders();
        } else {
            showAlert(response.message || 'Failed to receive order', 'danger');
        }
    } catch (error) {
        console.error('Error receiving order:', error);
        showAlert('Error receiving order', 'danger');
    }
};

window.openOrderModal = function(supplierId) {
    const modal = new bootstrap.Modal(document.getElementById('createOrderModal'));
    document.getElementById('orderSupplier').value = supplierId;
    modal.show();
};

// --- Helpers ---

function updateSupplierStats(suppliers) {
    const activeCount = suppliers.length; // Simplified
    // Update UI if elements exist
    const activeEl = document.querySelector('.card.bg-primary h3');
    if (activeEl) activeEl.textContent = activeCount;
}

function updateOrderStats(orders) {
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    // Update UI
    const pendingEl = document.querySelector('.card.bg-warning h3');
    if (pendingEl) pendingEl.textContent = pendingCount;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
}

// --- Charts ---
function initializeCharts() {
    const ctxProcurement = document.getElementById('procurementChart');
    if (ctxProcurement) {
        // Destroy existing chart if it exists
        const existingChart = Chart.getChart(ctxProcurement);
        if (existingChart) existingChart.destroy();

        new Chart(ctxProcurement.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Fresh Produce',
                    data: [8500000, 9200000, 7800000, 10500000, 9800000, 11200000],
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Dry Goods',
                    data: [4500000, 5200000, 4800000, 6500000, 5800000, 6200000],
                    borderColor: '#FFA000',
                    backgroundColor: 'rgba(255, 160, 0, 0.1)',
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Packaging',
                    data: [2500000, 2800000, 2200000, 3500000, 3200000, 3800000],
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
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
                                return 'UGX ' + (value / 1000000).toFixed(1) + 'M';
                            }
                        }
                    }
                }
            }
        });
    }

    const ctxSupplier = document.getElementById('supplierChart');
    if (ctxSupplier) {
        // Destroy existing chart if it exists
        const existingChart = Chart.getChart(ctxSupplier);
        if (existingChart) existingChart.destroy();

        new Chart(ctxSupplier.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Excellent', 'Good', 'Average', 'Poor'],
                datasets: [{
                    data: [45, 30, 20, 5],
                    backgroundColor: ['#4CAF50', '#8BC34A', '#FFC107', '#F44336']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }
}
