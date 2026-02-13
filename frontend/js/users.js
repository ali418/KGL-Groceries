
// js/users.js

document.addEventListener('DOMContentLoaded', () => {
    loadBranches();
    loadUsers();
    setupEventListeners();
});

let branches = [];
let users = [];
let editingUserId = null; // Track if we are editing a user

async function loadBranches() {
    try {
        const response = await api.get('/branches');
        branches = response;
        const branchSelect = document.getElementById('userBranch');
        // Keep the first option
        const firstOption = branchSelect.firstElementChild;
        branchSelect.innerHTML = '';
        branchSelect.appendChild(firstOption);
        
        branches.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch._id;
            option.textContent = branch.name;
            branchSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading branches:', error);
        // alert('Failed to load branches');
    }
}

async function loadUsers() {
    try {
        const response = await api.get('/users');
        users = response;
        renderUsersTable(users);
        updateStats(users);
    } catch (error) {
        console.error('Error loading users:', error);
        // alert('Failed to load users');
    }
}

function renderUsersTable(usersToRender) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';

    if (usersToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No users found</td></tr>';
        return;
    }

    usersToRender.forEach(user => {
        const branchName = user.branch ? user.branch.name : 'N/A';
        const roleBadge = getRoleBadge(user.role);
        const statusBadge = user.isActive ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-danger">Inactive</span>';
        const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never';
        const phone = user.contact?.phone || '-';
        const email = user.contact?.email || '-';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff" 
                         alt="Profile" class="rounded-circle me-2" width="32">
                    <strong>${user.name}</strong>
                </div>
            </td>
            <td>${email}</td>
            <td>${roleBadge}</td>
            <td>${branchName}</td>
            <td>${user.username}</td>
            <td>${phone}</td>
            <td>${statusBadge}</td>
            <td>${lastLogin}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditModal('${user._id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function getRoleBadge(role) {
    switch (role) {
        case 'director': return '<span class="badge bg-primary">Director</span>';
        case 'manager': return '<span class="badge bg-info">Manager</span>';
        case 'agent': return '<span class="badge bg-success">Sales Agent</span>';
        default: return `<span class="badge bg-secondary">${role}</span>`;
    }
}

function updateStats(usersData) {
    const total = usersData.length;
    const directors = usersData.filter(u => u.role === 'director').length;
    const managers = usersData.filter(u => u.role === 'manager').length;
    const agents = usersData.filter(u => u.role === 'agent').length;

    const safeSetText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    safeSetText('totalUsersCount', total);
    safeSetText('directorsCount', directors);
    safeSetText('managersCount', managers);
    safeSetText('agentsCount', agents);
    safeSetText('totalUsersBadge', `${total} users`);
}

function setupEventListeners() {
    document.getElementById('saveUserBtn').addEventListener('click', saveUser);
    
    // Reset modal when closed
    const modalEl = document.getElementById('addUserModal');
    if (modalEl) {
        modalEl.addEventListener('hidden.bs.modal', () => {
            document.getElementById('addUserForm').reset();
            editingUserId = null;
            document.getElementById('addUserModalLabel').textContent = 'Add New User';
            document.getElementById('saveUserBtn').textContent = 'Create User';
            document.getElementById('userPassword').required = true;
            document.getElementById('userPassword').parentElement.style.display = 'block'; // Ensure password field is shown
        });
    }

    // Search functionality
    const searchInput = document.querySelector('input[placeholder="Name or NIN..."]');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredUsers = users.filter(user => 
                user.name.toLowerCase().includes(searchTerm) || 
                user.username.toLowerCase().includes(searchTerm)
            );
            renderUsersTable(filteredUsers);
        });
    }
}

// Open modal for editing
window.openEditModal = function(userId) {
    const user = users.find(u => u._id === userId);
    if (!user) return;

    editingUserId = userId;
    
    // Update modal title and button
    document.getElementById('addUserModalLabel').textContent = 'Edit User';
    document.getElementById('saveUserBtn').textContent = 'Update User';

    // Populate fields
    document.getElementById('userFullName').value = user.name;
    document.getElementById('userEmail').value = user.contact?.email || '';
    document.getElementById('userRole').value = user.role;
    document.getElementById('userBranch').value = user.branch?._id || user.branch;
    document.getElementById('userPhone').value = user.contact?.phone || '';
    document.getElementById('userUsername').value = user.username;
    
    // Password is optional for edit
    const passwordInput = document.getElementById('userPassword');
    passwordInput.required = false;
    // We can leave it visible but optional, or hide it. 
    // Usually better to leave it visible to allow password reset during edit if needed.
    // Or we could hide it and have a separate "Reset Password" button.
    // For simplicity, let's leave it, if empty we don't update password (backend logic might need adjustment or we filter it out)
    // But backend PUT /users/:id usually doesn't update password unless specific endpoint.
    // Checking backend routes: PUT /users/:id DOES NOT update password.
    // So hiding password field is better.
    passwordInput.parentElement.style.display = 'none';

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
    modal.show();
};

async function saveUser() {
    const btn = document.getElementById('saveUserBtn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const userData = {
        name: document.getElementById('userFullName').value,
        email: document.getElementById('userEmail').value,
        role: document.getElementById('userRole').value,
        branchId: document.getElementById('userBranch').value,
        phone: document.getElementById('userPhone').value,
        // username: document.getElementById('userUsername').value // Username is usually immutable or needs check
    };

    // If creating new user
    if (!editingUserId) {
        userData.username = document.getElementById('userUsername').value;
        userData.password = document.getElementById('userPassword').value;
    } else {
        // If editing, we generally don't send username if it's not allowed to change, but let's check backend.
        // Backend PUT /users/:id allows updating: name, role, branchId, phone, email, status.
        // It does NOT update username or password.
    }

    try {
        let response;
        if (editingUserId) {
            response = await api.put(`/users/${editingUserId}`, userData);
        } else {
            response = await api.post('/users', userData);
        }
        
        if (response.user || response.message === 'User created successfully' || response.message === 'User updated successfully') {
            const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
            modal.hide();
            alert(editingUserId ? 'User updated successfully!' : 'User created successfully!');
            loadUsers();
        } else {
            alert('Operation failed: ' + (response.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error saving user:', error);
        alert('Error saving user: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to deactivate this user?')) return;

    try {
        await api.delete(`/users/${userId}`);
        alert('User deactivated successfully');
        loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to deactivate user');
    }
}

window.deleteUser = deleteUser;
