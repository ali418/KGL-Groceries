/**
 * KGL Groceries API Helper
 * Centralized API communication module for all frontend pages
 */

// API Base URL - automatically uses current origin
const API_BASE_URL = window.location.origin + '/api';

/**
 * Get authentication token from localStorage
 * @returns {string|null} JWT token or null if not found
 */
const getToken = () => localStorage.getItem('kgl_token');

/**
 * Get current user data from localStorage
 * @returns {object|null} User object or null if not found
 */
const getCurrentUser = () => {
    const userStr = localStorage.getItem('kgl_user');
    return userStr ? JSON.parse(userStr) : null;
};

/**
 * Generic API call function with error handling
 * @param {string} endpoint - API endpoint (e.g., '/auth/login')
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<any>} Parsed JSON response
 */
async function apiCall(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        // Handle unauthorized (token expired or invalid)
        if (response.status === 401) {
            console.warn('Unauthorized - redirecting to login');
            localStorage.removeItem('kgl_token');
            localStorage.removeItem('kgl_user');
            window.location.href = '/login.html';
            throw new Error('Unauthorized');
        }

        // Handle other error responses
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || `HTTP Error ${response.status}`);
        }

        return response.json();
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        throw error;
    }
}

/**
 * API object with all available endpoints
 */
const API = {
    // ============================================
    // Authentication
    // ============================================
    auth: {
        /**
         * Login user
         * @param {object} credentials - { username, password }
         * @returns {Promise<{token: string, user: object}>}
         */
        login: (credentials) => apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        }),

        /**
         * Logout user
         * @returns {Promise<void>}
         */
        logout: () => {
            localStorage.removeItem('kgl_token');
            localStorage.removeItem('kgl_user');
            window.location.href = '/login.html';
        }
    },

    // ============================================
    // Sales
    // ============================================
    sales: {
        /**
         * Get all sales with optional filters
         * @param {object} filters - { limit, sort, branch, agent, startDate, endDate }
         * @returns {Promise<Array>}
         */
        getAll: (filters = {}) => {
            const params = new URLSearchParams(filters);
            return apiCall(`/sales?${params}`);
        },

        /**
         * Get single sale by ID
         * @param {string} id - Sale ID
         * @returns {Promise<object>}
         */
        getById: (id) => apiCall(`/sales/${id}`),

        /**
         * Create new sale
         * @param {object} saleData - Sale details
         * @returns {Promise<object>}
         */
        create: (saleData) => apiCall('/sales', {
            method: 'POST',
            body: JSON.stringify(saleData)
        })
    },

    // ============================================
    // Reports
    // ============================================
    reports: {
        getDashboardStats: () => apiCall('/reports/dashboard'),
        getSalesTrend: () => apiCall('/reports/sales-trend')
    },

        /**
         * Update sale
         * @param {string} id - Sale ID
         * @param {object} updates - Updated fields
         * @returns {Promise<object>}
         */
        update: (id, updates) => apiCall(`/sales/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        }),

        /**
         * Delete sale
         * @param {string} id - Sale ID
         * @returns {Promise<void>}
         */
        delete: (id) => apiCall(`/sales/${id}`, { method: 'DELETE' })
    },

    // ============================================
    // Produce (Products/Inventory)
    // ============================================
    produce: {
        /**
         * Get all produce items
         * @returns {Promise<Array>}
         */
        getAll: () => apiCall('/produce'),

        /**
         * Get single produce by ID
         * @param {string} id - Produce ID
         * @returns {Promise<object>}
         */
        getById: (id) => apiCall(`/produce/${id}`),

        /**
         * Create new produce item
         * @param {object} produceData - Produce details
         * @returns {Promise<object>}
         */
        create: (produceData) => apiCall('/produce', {
            method: 'POST',
            body: JSON.stringify(produceData)
        }),

        /**
         * Update produce
         * @param {string} id - Produce ID
         * @param {object} updates - Updated fields
         * @returns {Promise<object>}
         */
        update: (id, updates) => apiCall(`/produce/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        }),

        /**
         * Delete produce
         * @param {string} id - Produce ID
         * @returns {Promise<void>}
         */
        delete: (id) => apiCall(`/produce/${id}`, { method: 'DELETE' })
    },

    // ============================================
    // Users
    // ============================================
    users: {
        /**
         * Get all users
         * @returns {Promise<Array>}
         */
        getAll: () => apiCall('/users'),

        /**
         * Get single user by ID
         * @param {string} id - User ID
         * @returns {Promise<object>}
         */
        getById: (id) => apiCall(`/users/${id}`),

        /**
         * Create new user
         * @param {object} userData - User details
         * @returns {Promise<object>}
         */
        create: (userData) => apiCall('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        }),

        /**
         * Update user
         * @param {string} id - User ID
         * @param {object} updates - Updated fields
         * @returns {Promise<object>}
         */
        update: (id, updates) => apiCall(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        }),

        /**
         * Delete user
         * @param {string} id - User ID
         * @returns {Promise<void>}
         */
        delete: (id) => apiCall(`/users/${id}`, { method: 'DELETE' })
    },

    // ============================================
    // Branches
    // ============================================
    branches: {
        /**
         * Get all branches
         * @returns {Promise<Array>}
         */
        getAll: () => apiCall('/branches')
    },

    // ============================================
    // Credit Sales
    // ============================================
    creditSales: {
        /**
         * Get all credit sales
         * @param {object} filters - Optional filters
         * @returns {Promise<Array>}
         */
        getAll: (filters = {}) => {
            const params = new URLSearchParams(filters);
            return apiCall(`/credit-sales?${params}`);
        },

        /**
         * Get single credit sale by ID
         * @param {string} id - Credit sale ID
         * @returns {Promise<object>}
         */
        getById: (id) => apiCall(`/credit-sales/${id}`),

        /**
         * Record payment
         * @param {string} id - Credit sale ID
         * @param {object} payment - Payment details
         * @returns {Promise<object>}
         */
        recordPayment: (id, payment) => apiCall(`/credit-sales/${id}/payment`, {
            method: 'POST',
            body: JSON.stringify(payment)
        })
    },

    // ============================================
    // Reports
    // ============================================
    reports: {
        /**
         * Get dashboard statistics
         * @returns {Promise<object>} Dashboard stats
         */
        getDashboardStats: () => apiCall('/reports/dashboard'),

        /**
         * Get sales report
         * @param {object} filters - { startDate, endDate, branch, agent }
         * @returns {Promise<object>}
         */
        getSalesReport: (filters = {}) => {
            const params = new URLSearchParams(filters);
            return apiCall(`/reports/sales?${params}`);
        }
    },

    // ============================================
    // Procurement
    // ============================================
    procurement: {
        /**
         * Get all procurement records
         * @returns {Promise<Array>}
         */
        getAll: () => apiCall('/procurement', {
            // Note: procurement uses different base path
            headers: { 'Content-Type': 'application/json' }
        }),

        /**
         * Create new procurement record
         * @param {object} procurementData - Procurement details
         * @returns {Promise<object>}
         */
        create: (procurementData) => apiCall('/procurement', {
            method: 'POST',
            body: JSON.stringify(procurementData)
        })
    }
};

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
function isAuthenticated() {
    return !!getToken() && !!getCurrentUser();
}

/**
 * Require authentication - redirect to login if not authenticated
 * Call this at the top of protected pages
 */
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
    }
}

/**
 * Check if user has required role
 * @param {string|Array<string>} allowedRoles - Single role or array of roles
 * @returns {boolean}
 */
function hasRole(allowedRoles) {
    const user = getCurrentUser();
    if (!user) return false;

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return roles.includes(user.role);
}

/**
 * Show loading spinner (utility function)
 */
function showLoading() {
    // You can implement a global loading spinner here
    console.log('Loading...');
}

/**
 * Hide loading spinner (utility function)
 */
function hideLoading() {
    console.log('Loading complete');
}

/**
 * Show error message (utility function)
 * @param {string} message - Error message to display
 */
function showError(message) {
    alert('خطأ: ' + message);
}

/**
 * Show success message (utility function)
 * @param {string} message - Success message to display
 */
function showSuccess(message) {
    alert('نجح: ' + message);
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API, isAuthenticated, requireAuth, hasRole, getCurrentUser };
}
