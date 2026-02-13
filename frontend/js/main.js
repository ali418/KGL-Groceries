
// --- Utilities ---
function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        // Create container if it doesn't exist
        const container = document.createElement('div');
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '1055';
        document.body.appendChild(container);
    }

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type} border-0`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');

    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    const container = document.querySelector('.toast-container');
    container.appendChild(toastEl);

    const toast = new bootstrap.Toast(toastEl);
    toast.show();

    // Remove after hidden
    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
}

// --- User Management Logic ---

let allUsers = [];
let allBranches = [];

function initUserManagement() {
    loadUsers();
    loadBranchesForDropdown();

    // Search Filter
    const searchInput = document.querySelector('input[placeholder="Name or NIN..."]');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allUsers.filter(u => 
                u.name.toLowerCase().includes(term) || 
                (u.contact && u.contact.phone && u.contact.phone.includes(term)) ||
                (u.username && u.username.toLowerCase().includes(term))
            );
            renderUsers(filtered);
        });
    }

    // Role Filter
    const roleSelect = document.querySelector('.form-select'); // Assuming first select is Role based on HTML structure order
    if (roleSelect) {
        roleSelect.addEventListener('change', (e) => {
            const role = e.target.value;
            if (role === 'All Roles') {
                renderUsers(allUsers);
            } else {
                // Map UI role names to Backend role values if needed, or ensure they match
                // Backend: director, manager, sales_agent
                // UI: Director, Manager, Sales Agent
                const filtered = allUsers.filter(u => u.role.toLowerCase() === role.toLowerCase().replace(' ', '_'));
                renderUsers(filtered);
            }
        });
    }

    // Save User Button
    const saveBtn = document.getElementById('saveUserBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveUser);
    }
}

async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        allUsers = await response.json();
        renderUsers(allUsers);
        
        // Update Stats
        updateUserStats(allUsers);
    } catch (error) {
        console.error('Error loading users:', error);
        showToast('Error loading users', 'error');
    }
}

async function loadBranchesForDropdown() {
    try {
        const response = await fetch('/api/branches');
        if (!response.ok) throw new Error('Failed to fetch branches');
        allBranches = await response.json();
        
        const branchSelect = document.getElementById('userBranch');
        if (branchSelect) {
            branchSelect.innerHTML = '<option value="">Select Branch</option>';
            allBranches.forEach(b => {
                branchSelect.innerHTML += `<option value="${b._id}">${b.name}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading branches:', error);
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>
                <div class="d-flex align-items-center">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff" alt="Profile" class="rounded-circle me-2" width="32">
                    <strong>${user.name}</strong>
                </div>
            </td>
            <td>${user.contact?.email || '-'}</td>
            <td><span class="badge bg-${getRoleBadgeColor(user.role)}">${formatRole(user.role)}</span></td>
            <td>${user.branch ? user.branch.name : 'Head Office'}</td>
            <td>${user.username}</td> <!-- Using Username as NIN placeholder for now or add NIN to model -->
            <td>${user.contact?.phone || '-'}</td>
            <td><span class="badge bg-${user.isActive ? 'success' : 'danger'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" title="View Details" onclick="viewUser('${user._id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning me-1" title="Edit User" onclick="editUser('${user._id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" title="Deactivate" onclick="deleteUser('${user._id}')">
                    <i class="fas fa-ban"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function getRoleBadgeColor(role) {
    switch (role) {
        case 'director': return 'danger';
        case 'manager': return 'warning';
        case 'agent': return 'info';
        default: return 'secondary';
    }
}

function formatRole(role) {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

async function saveUser() {
    const saveBtn = document.getElementById('saveUserBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    const payload = {
        name: document.getElementById('userFullName').value,
        email: document.getElementById('userEmail').value,
        role: document.getElementById('userRole').value,
        branchId: document.getElementById('userBranch').value,
        phone: document.getElementById('userPhone').value,
        username: document.getElementById('userUsername').value,
        password: document.getElementById('userPassword').value
    };
    
    // Note: NIN is in UI but not explicitly in my User model in previous context? 
    // Assuming User model has structure flexible enough or I need to add NIN. 
    // For now I won't send NIN to avoid error if schema doesn't have it, or I'll assume it's part of metadata if needed.
    // Actually, looking at `users.js` I wrote, I didn't include NIN. I will skip it for now or treat it as extra.

    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create user');
        }

        showToast('User created successfully!', 'success');
        
        // Close Modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
        if (modal) modal.hide();

        // Reset Form
        document.getElementById('addUserForm').reset();

        // Reload Users
        loadUsers();

    } catch (error) {
        console.error('Error saving user:', error);
        showToast(error.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Create User';
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to deactivate this user?')) return;

    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to deactivate user');

        showToast('User deactivated successfully', 'success');
        loadUsers();
    } catch (error) {
        console.error('Error:', error);
        showToast('Error deactivating user', 'error');
    }
}

function updateUserStats(users) {
    // Update simple stats if elements exist
    // Total
    const totalEl = document.querySelector('.card.bg-primary h3');
    if (totalEl) totalEl.textContent = users.length;

    // Directors
    const directorsEl = document.querySelector('.card.bg-info h3'); // Directors card color was Info? Check HTML.
    // HTML: Primary(Total), Info(Directors), Warning(Managers), Success(Agents)
    if (directorsEl) directorsEl.textContent = users.filter(u => u.role === 'director').length;

    // Managers
    const managersEl = document.querySelector('.card.bg-warning h3');
    if (managersEl) managersEl.textContent = users.filter(u => u.role === 'manager').length;

    // Agents
    const agentsEl = document.querySelector('.card.bg-success h3');
    if (agentsEl) agentsEl.textContent = users.filter(u => u.role === 'agent').length;
}

// Global scope for onclick handlers
window.viewUser = (id) => showToast('View details feature coming soon!', 'info');
window.editUser = (id) => showToast('Edit feature coming soon!', 'info');
window.deleteUser = deleteUser;

document.addEventListener('DOMContentLoaded', () => {
    // Check for Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Check for User Management Page
    if (window.location.pathname.includes('user_management.html')) {
        initUserManagement();
    }
});

// --- Auth Logic ---
async function handleLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.querySelector('button[type="submit"]');
    
    // Reset errors
    usernameInput.classList.remove('is-invalid');
    passwordInput.classList.remove('is-invalid');

    const username = usernameInput.value;
    const password = passwordInput.value;

    if (!username || !password) {
        showToast('Please enter both username and password', 'error');
        return;
    }

    try {
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const resBody = await response.json();

        if (!response.ok) {
            throw new Error(resBody.error || 'Login failed');
        }

        const { token, user } = resBody.data;

        // Store Token & User Info
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        showToast('Login successful! Redirecting...', 'success');

        // Redirect based on role
        setTimeout(() => {
            if (user.role === 'director') {
                window.location.href = 'director_dashboard.html';
            } else if (user.role === 'agent') {
                window.location.href = 'sales_dashboard.html';
            } else if (user.role === 'manager') {
                window.location.href = 'manager_dashboard.html';
            } else {
                window.location.href = 'director_dashboard.html';
            }
        }, 1000);

    } catch (error) {
        console.error('Login Error:', error);
        showToast(error.message, 'error');
        usernameInput.classList.add('is-invalid');
        passwordInput.classList.add('is-invalid');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    }
}

// --- Dashboard UI Logic ---

document.addEventListener('DOMContentLoaded', () => {
    // Only run if we are NOT on the login page
    if (!window.location.pathname.includes('login.html')) {
        updateDashboardUI();
    }
});

function updateDashboardUI() {
    const userJson = localStorage.getItem('user');
    if (!userJson) {
        window.location.href = 'login.html';
        return;
    }

    const user = JSON.parse(userJson);

    // Enforce Role Access (allow only existing pages for each role)
    const path = window.location.pathname.split('/').pop();
    const allowedByRole = {
        agent: [
            'sales_dashboard.html',
            'pos.html',
            'credit_sales.html',
            'my_history.html',
            'login.html'
        ],
        manager: [
            'manager_dashboard.html',
            'inventory_overview.html',
            'procurement.html',
            'sales_dashboard.html',
            'credit_exposure.html',
            'sales_reports.html',
            'pricing.html',
            'stock_control.html',
            'login.html'
        ],
        director: [
            'director_dashboard.html',
            'sales_reports.html',
            'user_management.html',
            'login.html'
        ]
    };
    const allowed = allowedByRole[user.role] || [];
    if (allowed.length && !allowed.some(name => path.includes(name))) {
        if (user.role === 'agent') {
            window.location.href = 'sales_dashboard.html';
        } else if (user.role === 'manager') {
            window.location.href = 'manager_dashboard.html';
        } else {
            window.location.href = 'director_dashboard.html';
        }
        return;
    }

    // 1. Update Profile Section (Sidebar pages)
    const profileName = document.querySelector('.user-profile span');
    const profileImg = document.querySelector('.user-profile img');
    if (profileName) profileName.textContent = user.name + ' (' + capitalize(user.role) + ')';
    if (profileImg) profileImg.src = `https://ui-avatars.com/api/?name=${user.name}&background=random`;


    // 2. Update POS Navbar (Sales Agent)
    const posUser = document.querySelector('.navbar .text-muted strong');
    if (posUser) posUser.textContent = user.name;

    // Note: Sidebar links are now fixed in each HTML file for each role
    // No dynamic filtering needed
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// --- Manager Dashboard Logic ---
async function loadManagerDashboardData() {
    try {
        console.log('Loading dashboard data...');
        
        // Fetch Dashboard Stats
        const stats = await API.reports.getDashboardStats();
        
        // Update Stats in DOM
        if (document.getElementById('todaySales')) {
            document.getElementById('todaySales').textContent = formatCurrency(stats.todaySales || 0);
        }
        if (document.getElementById('stockValue')) {
            document.getElementById('stockValue').textContent = formatCurrency(stats.stockValue || 0);
        }
        if (document.getElementById('lowStockCount')) {
            document.getElementById('lowStockCount').textContent = (stats.lowStockCount || 0) + ' Items';
        }
        if (document.getElementById('totalCredit')) {
            document.getElementById('totalCredit').textContent = formatCurrency(stats.totalCredit || 0);
        }

        // Fetch Recent Transactions (using sales API)
        const recentSales = await API.sales.getAll({ limit: 5, sort: '-saleDate' });
        const tbody = document.getElementById('recentTransactionsBody');
        
        if (tbody && recentSales.length > 0) {
            tbody.innerHTML = recentSales.map(sale => `
                <tr>
                    <td><strong>${sale.invoiceNumber || 'N/A'}</strong></td>
                    <td>${sale.agent?.name || 'Unknown'}</td>
                    <td>${formatCurrency(sale.payment?.amountPaid || 0)}</td>
                    <td><span class="badge bg-${sale.payment?.method === 'credit' ? 'warning' : 'success'}">${capitalize(sale.payment?.method || 'cash')}</span></td>
                    <td>${new Date(sale.saleDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                </tr>
            `).join('');
        } else if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No recent transactions</td></tr>';
        }

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(amount);
}

// Initialize Dashboard Data
if (window.location.pathname.includes('manager_dashboard.html')) {
    document.addEventListener('DOMContentLoaded', loadManagerDashboardData);
}
