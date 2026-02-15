
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadProducts();
    setupEventListeners();
});

let allProducts = [];
let cart = [];
let currentCategory = '';
let searchQuery = '';

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
    }
}

function formatCurrency(amount) {
    return `UGX ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function setupEventListeners() {
    // Search and Filter
    document.getElementById('productSearch').addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        filterAndRenderProducts();
    });

    document.getElementById('categoryFilter').addEventListener('change', (e) => {
        currentCategory = e.target.value.toLowerCase();
        filterAndRenderProducts();
    });

    // Cart Actions
    document.getElementById('clearCartBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the cart?')) {
            clearCart();
        }
    });

    document.getElementById('checkoutBtn').addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('checkoutModal'));
        modal.show();
        // Default amount paid to total
        const total = calculateTotal();
        document.getElementById('amountPaid').value = total.toFixed(2);
    });

    // Payment Method Toggle
    const payCash = document.getElementById('payCash');
    const payCredit = document.getElementById('payCredit');
    const creditDetails = document.getElementById('creditDetails');

    payCash.addEventListener('change', () => {
        if (payCash.checked) creditDetails.classList.add('d-none');
    });

    payCredit.addEventListener('change', () => {
        if (payCredit.checked) creditDetails.classList.remove('d-none');
    });

    // Confirm Payment
    document.getElementById('confirmPaymentBtn').addEventListener('click', processCheckout);
}

async function loadProducts() {
    try {
        const response = await api.get('/produce'); // Note: Endpoint is /produce based on produce.js
        // Handle different response structures if necessary
        if (Array.isArray(response)) {
            allProducts = response;
        } else if (response.data && Array.isArray(response.data)) {
            allProducts = response.data;
        } else {
            allProducts = [];
        }
        filterAndRenderProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('productsGrid').innerHTML = `
            <div class="col-12 text-center text-danger py-5">
                <p>Failed to load products. Please try again.</p>
                <button class="btn btn-outline-primary" onclick="loadProducts()">Retry</button>
            </div>
        `;
    }
}

function filterAndRenderProducts() {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';

    const filtered = allProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery);
        const matchesCategory = currentCategory === '' || (p.type && p.type.toLowerCase() === currentCategory);
        return matchesSearch && matchesCategory;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                <p>No products found matching your criteria.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(product => {
        const currentStock = product.currentStock ? product.currentStock.tonnage : 0;
        const unit = product.currentStock ? product.currentStock.unit : 'kg';
        const price = product.pricing ? product.pricing.salePrice : 0;
        const isOutOfStock = currentStock <= 0;

        const card = document.createElement('div');
        card.className = 'col-md-3 col-sm-6';
        card.innerHTML = `
            <div class="card product-card h-100 text-center p-3 ${isOutOfStock ? 'opacity-75' : ''}" 
                 onclick="${isOutOfStock ? '' : `addToCart('${product._id}')`}" 
                 style="cursor: ${isOutOfStock ? 'not-allowed' : 'pointer'}">
                <div class="mb-3 bg-light rounded p-3 mx-auto d-flex align-items-center justify-content-center" style="width:80px; height:80px;">
                    <i class="fas fa-${getProductIcon(product.type)} fa-3x ${isOutOfStock ? 'text-secondary' : 'text-success'}"></i>
                </div>
                <h6 class="fw-bold mb-1">${product.name}</h6>
                <p class="text-muted small mb-2 ${isOutOfStock ? 'text-danger fw-bold' : ''}">
                    ${isOutOfStock ? 'Out of Stock' : `${currentStock} ${unit} left`}
                </p>
                <h5 class="text-success fw-bold">${formatCurrency(price)} <small class="text-muted fs-6">/${unit}</small></h5>
            </div>
        `;
        grid.appendChild(card);
    });
}

function getProductIcon(type) {
    if (!type) return 'box';
    type = type.toLowerCase();
    if (type.includes('fruit')) return 'apple-alt';
    if (type.includes('vegetable')) return 'carrot';
    if (type.includes('grain')) return 'wheat';
    if (type.includes('dairy')) return 'cheese';
    if (type.includes('meat')) return 'drumstick-bite';
    return 'leaf';
}

function addToCart(productId) {
    const product = allProducts.find(p => p._id === productId);
    if (!product) return;

    const currentStock = product.currentStock ? product.currentStock.tonnage : 0;
    const existingItem = cart.find(item => item.produceId === productId);
    
    // Default quantity increment
    const increment = 1; 

    if (existingItem) {
        if (existingItem.quantity + increment > currentStock) {
            alert(`Cannot add more. Only ${currentStock} ${product.currentStock.unit} available.`);
            return;
        }
        existingItem.quantity += increment;
    } else {
        if (increment > currentStock) {
            alert(`Cannot add. Only ${currentStock} ${product.currentStock.unit} available.`);
            return;
        }
        cart.push({
            produceId: product._id,
            name: product.name,
            unitPrice: product.pricing.salePrice,
            quantity: increment,
            unit: product.currentStock.unit,
            maxStock: currentStock
        });
    }

    renderCart();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.produceId !== productId);
    renderCart();
}

function updateCartQuantity(productId, newQty) {
    const item = cart.find(i => i.produceId === productId);
    if (!item) return;

    newQty = parseFloat(newQty);
    if (isNaN(newQty) || newQty <= 0) {
        removeFromCart(productId);
        return;
    }

    if (newQty > item.maxStock) {
        alert(`Cannot exceed available stock of ${item.maxStock} ${item.unit}`);
        item.quantity = item.maxStock;
    } else {
        item.quantity = newQty;
    }
    renderCart();
}

function renderCart() {
    const cartContainer = document.getElementById('cartItems');
    cartContainer.innerHTML = '';

    if (cart.length === 0) {
        cartContainer.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="fas fa-shopping-basket fa-3x mb-3"></i>
                <p>Cart is empty</p>
            </div>
        `;
        document.getElementById('checkoutBtn').disabled = true;
        updateTotals();
        return;
    }

    cart.forEach(item => {
        const itemTotal = item.quantity * item.unitPrice;
        const div = document.createElement('div');
        div.className = 'd-flex justify-content-between align-items-center mb-3 pb-3 border-bottom';
        div.innerHTML = `
            <div style="flex-grow: 1;">
                <h6 class="mb-0 fw-bold">${item.name}</h6>
                <div class="input-group input-group-sm mt-1" style="width: 120px;">
                    <input type="number" class="form-control" value="${item.quantity}" min="0.1" step="0.1" 
                           onchange="updateCartQuantity('${item.produceId}', this.value)">
                    <span class="input-group-text">${item.unit}</span>
                </div>
                <small class="text-muted">@ ${formatCurrency(item.unitPrice)}/${item.unit}</small>
            </div>
                <div class="text-end ms-3">
                <h6 class="mb-0 fw-bold">${formatCurrency(itemTotal)}</h6>
                <i class="fas fa-trash-alt text-danger small cursor-pointer mt-2" onclick="removeFromCart('${item.produceId}')"></i>
            </div>
        `;
        cartContainer.appendChild(div);
    });

    document.getElementById('checkoutBtn').disabled = false;
    updateTotals();
}

function calculateTotal() {
    return cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
}

function updateTotals() {
    const total = calculateTotal();
    document.getElementById('cartSubtotal').textContent = formatCurrency(total);
    document.getElementById('cartTotal').textContent = formatCurrency(total);
}

function clearCart() {
    cart = [];
    renderCart();
}

async function processCheckout() {
    const btn = document.getElementById('confirmPaymentBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';

    const paymentType = document.querySelector('input[name="paymentType"]:checked').value;
    const buyerName = document.getElementById('buyerName').value;
    const amountPaid = parseFloat(document.getElementById('amountPaid').value);
    
    const total = calculateTotal();

    // Validation
    if (isNaN(amountPaid) || amountPaid < 0) {
        alert('Please enter a valid amount paid.');
        btn.disabled = false;
        btn.textContent = 'Print Receipt & Finish';
        return;
    }

    if (paymentType === 'credit' && !buyerName) {
        alert('Buyer name is required for credit sales.');
        btn.disabled = false;
        btn.textContent = 'Print Receipt & Finish';
        return;
    }

    const payload = {
        items: cart.map(item => ({
            produceId: item.produceId,
            quantity: item.quantity,
            unitPrice: item.unitPrice
        })),
        payment: {
            method: paymentType,
            amountPaid: amountPaid,
            buyerName: buyerName
        }
    };

    try {
        const response = await api.post('/sales/checkout', payload);
        
        if (response.success) {
            // Success
            const modal = bootstrap.Modal.getInstance(document.getElementById('checkoutModal'));
            modal.hide();
            
            alert('Transaction successful!');
            clearCart();
            loadProducts(); // Reload to update stock
            
            // Optional: Print receipt logic here
        } else {
            alert('Checkout failed: ' + (response.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Checkout error:', error);
        alert('An error occurred during checkout. Please try again.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Print Receipt & Finish';
    }
}
