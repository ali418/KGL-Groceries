/**
 * KGL Groceries LTD - Main Application Script
 * Handles global interactions, login logic, and UI toggles.
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // Handle Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();
            
            // Simple Client-Side Authentication for Prototype
            if (username === 'admin' && password === '123') {
                window.location.href = 'director_dashboard.html';
            } else if (username === 'manager' && password === '123') {
                window.location.href = 'manager_dashboard.html';
            } else if (username === 'agent' && password === '123') {
                window.location.href = 'sales_dashboard.html';
            } else {
                alert('Invalid credentials! Please try again.\n(Hint: check the demo box)');
            }
        });
    }

    // Handle Sidebar Toggle (for Dashboard pages)
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function(e) {
            e.preventDefault();
            sidebar.classList.toggle('active');
            
            // Adjust main content margin on mobile
            if (window.innerWidth <= 768) {
                // On mobile, toggling adds/removes the 'active' class which handles visibility
            } else {
                // On desktop, we might want to collapse it (optional enhancement)
            }
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
});
