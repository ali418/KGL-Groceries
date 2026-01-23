const { protect } = require('./auth');

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${req.user.role} role not authorized to access this resource.`
      });
    }

    next();
  };
};

const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication required.'
      });
    }

    const rolePermissions = {
      director: ['view_reports', 'view_all_data'],
      manager: ['manage_inventory', 'manage_sales', 'manage_procurement', 'view_reports'],
      sales_agent: ['record_sale', 'record_credit_sale', 'view_own_sales']
    };

    const userPermissions = rolePermissions[req.user.role] || [];
    
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Insufficient permissions.`
      });
    }

    next();
  };
};

module.exports = { authorize, checkPermission };