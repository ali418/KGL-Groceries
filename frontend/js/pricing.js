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
    // Implement edit logic if needed, or redirect to edit modal
    alert('Edit price for product: ' + id);
};
