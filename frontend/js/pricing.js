document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});

let allProducts = [];

async function loadProducts() {
    try {
        const response = await api.get('/produce');
        allProducts = response;
        renderPricingTable(allProducts);
        updatePricingStats(allProducts);
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function updatePricingStats(products) {
    const total = products.length;
    const avgMargin = products.reduce((acc, curr) => {
        const cost = curr.pricing?.costPrice || 0;
        const sell = curr.pricing?.sellingPrice || 0;
        if (sell === 0) return acc;
        return acc + ((sell - cost) / sell * 100);
    }, 0) / (total || 1);

    const safeSetText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    safeSetText('totalProductsCount', total);
    safeSetText('avgMargin', avgMargin.toFixed(1) + '%');
}

function renderPricingTable(productsList) {
    const tbody = document.getElementById('pricingTableBody');
    if (!tbody) return;

    tbody.innerHTML = productsList.map(p => `
        <tr>
            <td>
                <div class="d-flex align-items-center">
                    <strong>${p.name}</strong>
                </div>
            </td>
            <td>${p.type}</td>
            <td>${formatCurrency(p.pricing?.costPrice || 0)}</td>
            <td>${formatCurrency(p.pricing?.sellingPrice || 0)}</td>
            <td>
                <span class="badge bg-success bg-opacity-10 text-success">
                    ${calculateMargin(p)}%
                </span>
            </td>
            <td>${new Date(p.updatedAt).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editPrice('${p._id}')">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function calculateMargin(p) {
    const cost = p.pricing?.costPrice || 0;
    const sell = p.pricing?.sellingPrice || 0;
    if (sell === 0) return 0;
    return (((sell - cost) / sell) * 100).toFixed(1);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        currencyDisplay: 'code',
        maximumFractionDigits: 0
    }).format(amount);
}

window.editPrice = function(id) {
    const product = allProducts.find(p => p._id === id);
    if (!product) return;
    document.getElementById('editProductId').value = product._id;
    document.getElementById('editProductName').value = product.name || '';
    const cost = product.pricing?.costPrice || 0;
    const sell = product.pricing?.sellingPrice || 0;
    document.getElementById('editCostPrice').value = cost;
    document.getElementById('editSellingPrice').value = sell;
    const margin = sell > 0 ? (((sell - cost) / sell) * 100).toFixed(1) + '%' : '0%';
    document.getElementById('editMargin').value = margin;
    const modal = new bootstrap.Modal(document.getElementById('editPriceModal'));
    modal.show();
};

// Attach update logic
document.addEventListener('DOMContentLoaded', () => {
    const costInput = document.getElementById('editCostPrice');
    const sellInput = document.getElementById('editSellingPrice');
    function recalcMargin() {
        const cost = parseFloat(costInput.value) || 0;
        const sell = parseFloat(sellInput.value) || 0;
        const margin = sell > 0 ? (((sell - cost) / sell) * 100).toFixed(1) + '%' : '0%';
        document.getElementById('editMargin').value = margin;
    }
    if (costInput) costInput.addEventListener('input', recalcMargin);
    if (sellInput) sellInput.addEventListener('input', recalcMargin);
    
    const updateBtn = document.getElementById('updatePriceBtn');
    if (updateBtn) {
        updateBtn.addEventListener('click', async () => {
            const id = document.getElementById('editProductId').value;
            const costPrice = parseFloat(document.getElementById('editCostPrice').value) || 0;
            const salePrice = parseFloat(document.getElementById('editSellingPrice').value) || 0;
            if (salePrice <= 0) {
                alert('Selling price must be greater than 0');
                return;
            }
            try {
                const res = await api.put(`/produce/${id}`, { costPrice, salePrice });
                // Update local cache
                const idx = allProducts.findIndex(p => p._id === id);
                if (idx >= 0) {
                    allProducts[idx].pricing = allProducts[idx].pricing || {};
                    allProducts[idx].pricing.costPrice = costPrice;
                    allProducts[idx].pricing.sellingPrice = salePrice;
                    allProducts[idx].updatedAt = new Date().toISOString();
                }
                renderPricingTable(allProducts);
                updatePricingStats(allProducts);
                bootstrap.Modal.getInstance(document.getElementById('editPriceModal')).hide();
            } catch (error) {
                console.error('Update price error:', error);
                alert(error.message || 'Failed to update price');
            }
        });
    }
});
