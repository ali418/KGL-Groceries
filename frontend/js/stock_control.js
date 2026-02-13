document.addEventListener('DOMContentLoaded', () => {
    loadBranches();
    loadProducts();
    initializeCharts();
});

let allProducts = [];

function initializeCharts() {
    // Stock Movement Chart
    const ctxMovement = document.getElementById('stockMovementChart');
    if (ctxMovement) {
        new Chart(ctxMovement.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Jan 1', 'Jan 2', 'Jan 3', 'Jan 4', 'Jan 5', 'Jan 6', 'Jan 7'],
                datasets: [{
                    label: 'Stock In',
                    data: [850, 920, 780, 1050, 980, 1120, 890],
                    borderColor: '#2E7D32',
                    backgroundColor: 'rgba(46, 125, 50, 0.1)',
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Stock Out',
                    data: [650, 720, 680, 850, 780, 920, 690],
                    borderColor: '#D32F2F',
                    backgroundColor: 'rgba(211, 47, 47, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + ' kg';
                            }
                        }
                    }
                }
            }
        });
    }

    // Stock Status Distribution Chart
    const ctxStatus = document.getElementById('stockStatusChart');
    if (ctxStatus) {
        new Chart(ctxStatus.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Well Stocked', 'Low Stock', 'Out of Stock', 'Below Minimum'],
                datasets: [{
                    data: [156, 23, 7, 15],
                    backgroundColor: ['#4CAF50', '#FFA000', '#F44336', '#FF9800']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

async function loadBranches() {
    try {
        const branches = await api.get('/branches');
        const branchSelect = document.getElementById('productBranch');
        branchSelect.innerHTML = '<option value="">Select Branch</option>';
        branches.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch._id;
            option.textContent = branch.name;
            branchSelect.appendChild(option);
        });
        
        // Select first branch by default if available
        if (branches.length > 0) {
            branchSelect.value = branches[0]._id;
        }
    } catch (error) {
        console.error('Error loading branches:', error);
    }
}

async function loadProducts() {
    try {
        const products = await api.get('/produce');
        allProducts = products;
        renderProductsTable(products);
        updateSummaryCards(products);
    } catch (error) {
        console.error('Error loading products:', error);
        // Don't alert on load, just log
    }
}

function renderProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '';

    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4">No products found. Add one to get started!</td></tr>';
        return;
    }

    products.forEach(product => {
        const tr = document.createElement('tr');
        
        const currentStock = product.currentStock?.tonnage || 0;
        const minStock = product.thresholds?.minimumStock || 10;
        const unit = product.currentStock?.unit || 'kg';
        const stockStatus = getStockStatus(currentStock, minStock);
        
        tr.innerHTML = `
            <td>
                <div class="fw-bold text-primary">${product.name}</div>
            </td>
            <td><span class="badge bg-light text-dark border">${product.type}</span></td>
            <td>
                <span class="badge ${stockStatus.class}">${currentStock} ${unit}</span>
            </td>
            <td>
                <div class="small">Cost: ${formatCurrency(product.pricing?.costPrice || 0)}</div>
                <div class="fw-bold">Sale: ${formatCurrency(product.pricing?.salePrice || 0)}</div>
            </td>
            <td>${minStock} ${unit}</td>
            <td>${product.supplier?.name || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditModal('${product._id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct('${product._id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateSummaryCards(products) {
    let lowStock = 0;
    let outOfStock = 0;
    let wellStocked = 0;
    let totalValue = 0;

    products.forEach(p => {
        const current = p.currentStock?.tonnage || 0;
        const min = p.thresholds?.minimumStock || 10;
        const cost = p.pricing?.costPrice || 0;

        if (current <= 0) outOfStock++;
        else if (current < min) lowStock++;
        else wellStocked++;

        totalValue += current * cost;
    });

    // Update UI cards if they exist (using selectors based on card titles or traverse)
    // Since cards don't have IDs, we might need to add IDs to HTML or select by text content.
    // For now, I'll try to select by class structure assuming the order is fixed as in HTML.
    
    // Card 1: Low Stock
    const lowStockEl = document.querySelector('.card:nth-child(1) h3');
    if (lowStockEl) lowStockEl.textContent = lowStock;

    // Card 2: Out of Stock
    const outStockEl = document.querySelector('.card:nth-child(2) h3');
    if (outStockEl) outStockEl.textContent = outOfStock;

    // Card 3: Well Stocked
    const wellStockedEl = document.querySelector('.card:nth-child(3) h3');
    if (wellStockedEl) wellStockedEl.textContent = wellStocked;

    // Card 4: Stock Value
    const valueEl = document.querySelector('.card:nth-child(4) h3');
    if (valueEl) valueEl.textContent = formatCurrency(totalValue);
}

function getStockStatus(current, min) {
    if (current <= 0) return { label: 'Out of Stock', class: 'bg-danger' };
    if (current < min) return { label: 'Low Stock', class: 'bg-warning' };
    return { label: 'In Stock', class: 'bg-success' };
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(amount);
}

// Make functions available globally for onclick events
window.saveProduct = async function() {
    const id = document.getElementById('productId').value;
    const name = document.getElementById('productName').value;
    const type = document.getElementById('productType').value;
    const unit = document.getElementById('productUnit').value;
    const costPrice = document.getElementById('costPrice').value;
    const salePrice = document.getElementById('salePrice').value;
    const minStock = document.getElementById('minStock').value;
    const branch = document.getElementById('productBranch').value;
    const supplierName = document.getElementById('supplierName').value;

    if (!name || !type || !costPrice || !salePrice || !branch) {
        alert('Please fill in all required fields (Name, Type, Prices, Branch)');
        return;
    }

    const payload = {
        name,
        type,
        unit,
        costPrice: Number(costPrice),
        salePrice: Number(salePrice),
        minimumStock: Number(minStock),
        branch,
        supplierName
    };

    const submitBtn = document.querySelector('#addProductModal .btn-primary');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
        if (id) {
            await api.put(`/produce/${id}`, payload);
        } else {
            await api.post('/produce', payload);
        }
        
        // Close modal
        const modalEl = document.getElementById('addProductModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
        
        // Reset form
        document.getElementById('addProductForm').reset();
        document.getElementById('productId').value = '';
        
        // Reload
        loadProducts();
    } catch (error) {
        console.error('Error saving product:', error);
        alert(error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
};

window.openEditModal = function(id) {
    const product = allProducts.find(p => p._id === id);
    if (!product) return;

    document.getElementById('productId').value = product._id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productType').value = product.type;
    document.getElementById('productUnit').value = product.currentStock?.unit || 'kg';
    document.getElementById('costPrice').value = product.pricing?.costPrice || 0;
    document.getElementById('salePrice').value = product.pricing?.salePrice || 0;
    document.getElementById('minStock').value = product.thresholds?.minimumStock || 10;
    
    const branchSelect = document.getElementById('productBranch');
    if (product.branch) {
        // If branch is populated object, use _id, else use value
        const branchId = typeof product.branch === 'object' ? product.branch._id : product.branch;
        branchSelect.value = branchId;
    }
    
    document.getElementById('supplierName').value = product.supplier?.name || '';
    
    document.getElementById('productModalTitle').textContent = 'Edit Product';
    
    const modal = new bootstrap.Modal(document.getElementById('addProductModal'));
    modal.show();
};

window.deleteProduct = async function(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        await api.delete(`/produce/${id}`);
        loadProducts();
    } catch (error) {
        console.error('Error deleting product:', error);
        alert(error.message);
    }
};

// Reset modal on close
const modalEl = document.getElementById('addProductModal');
if (modalEl) {
    modalEl.addEventListener('hidden.bs.modal', () => {
        document.getElementById('addProductForm').reset();
        document.getElementById('productId').value = '';
        document.getElementById('productModalTitle').textContent = 'Add New Product';
    });
}
