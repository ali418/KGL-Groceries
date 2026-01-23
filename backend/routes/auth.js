const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/authController');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['director', 'manager', 'agent']).withMessage('Role must be either director, manager, or agent'),
  body('branch').isMongoId().withMessage('Valid branch ID is required')
];

const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const updateProfileValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('contact.phone').optional().trim().matches(/^\+?[\d\s\-\(\)]+$/).withMessage('Please enter a valid phone number'),
  body('contact.email').optional().trim().isEmail().withMessage('Please enter a valid email address')
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfileValidation, updateProfile);
router.put('/change-password', protect, changePasswordValidation, changePassword);

module.exports = router;