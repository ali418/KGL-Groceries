/**
 * KGL Groceries LTD - Main Application Script
 * Handles global interactions, login logic, and UI toggles.
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // 1. Initialize Default User in localStorage (Mock Data)
    initMockUsers();

    // 2. Setup Toast Container
    setupToastContainer();

    // Handle Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            
            // Error Handling: Empty Fields
            if (!username || !password) {
                showToast('Please enter both username and password.', 'error');
                return;
            }

            // Mock Login Logic
            const users = JSON.parse(localStorage.getItem('kgl_users')) || [];
            const user = users.find(u => u.username === username);

            if (!user) {
                // Error Handling: User Not Found
                showToast('Username does not exist.', 'error');
                usernameInput.focus();
            } else if (user.password !== password) {
                // Error Handling: Wrong Password
                showToast('Incorrect password. Please try again.', 'error');
                passwordInput.value = '';
                passwordInput.focus();
            } else {
                // Success: Login
                showToast('Login successful! Redirecting...', 'success');
                
                // Store Session
                const sessionData = {
                    username: user.username,
                    role: user.role,
                    loginTime: new Date().toISOString()
                };
                localStorage.setItem('kgl_session', JSON.stringify(sessionData));

                // Redirect based on role (Mock routing)
                setTimeout(() => {
                    if (user.role === 'Director') {
                        window.location.href = 'director_dashboard.html';
                    } else if (user.role === 'Manager') {
                        window.location.href = 'manager_dashboard.html';
                    } else if (user.role === 'Sales Agent') {
                        window.location.href = 'sales_dashboard.html';
                    } else {
                        window.location.href = 'manager_dashboard.html'; // Default
                    }
                }, 1500);
            }
        });
    }

    // Handle Sidebar Toggle (for Dashboard pages)
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function(e) {
            e.preventDefault();
            sidebar.classList.toggle('active');
        });
    }

    // Highlight active link based on current page
    const currentPath = window.location.pathname.split('/').pop();
    const menuLinks = document.querySelectorAll('.sidebar-menu a');
    
    menuLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (linkPath === currentPath) {
            link.classList.add('active');
        }
    });

    // Display Logged-in User Info on Dashboard
    updateDashboardUserInfo();
});

// --- Helper Functions ---

/**
 * Initializes mock users in localStorage if not present.
 */
function initMockUsers() {
    const existingUsers = localStorage.getItem('kgl_users');
    if (!existingUsers) {
        const defaultUsers = [
            { username: 'kgl_admin', password: 'groceries2026', role: 'Manager' }, // Requested Default
            { username: 'admin', password: '123', role: 'Director' },
            { username: 'manager', password: '123', role: 'Manager' },
            { username: 'agent', password: '123', role: 'Sales Agent' }
        ];
        localStorage.setItem('kgl_users', JSON.stringify(defaultUsers));
        console.log('Mock users initialized in localStorage.');
    }
}

/**
 * Creates the Toast container element if it doesn't exist.
 */
function setupToastContainer() {
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
}

/**
 * Shows a custom toast notification.
 * @param {string} message - The message to display.
 * @param {string} type - 'success' or 'error'.
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    
    // Icon based on type
    const iconClass = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    
    toast.innerHTML = `
        <i class="fas ${iconClass}"></i>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            container.removeChild(toast);
        }, 300); // Wait for transition
    }, 3000);
}

/**
 * Updates the dashboard user info from the session.
 */
function updateDashboardUserInfo() {
    const session = JSON.parse(localStorage.getItem('kgl_session'));
    const userNameElement = document.querySelector('.user-profile span'); // Adjust selector based on HTML
    const userRoleElement = document.querySelector('.user-profile small'); // If exists
    
    if (session && userNameElement) {
        // If the element contains just text, update it. 
        // Note: Check HTML structure. Usually it's text next to image.
        // Assuming: <span>Admin User</span>
        userNameElement.textContent = session.username;
    }
}
