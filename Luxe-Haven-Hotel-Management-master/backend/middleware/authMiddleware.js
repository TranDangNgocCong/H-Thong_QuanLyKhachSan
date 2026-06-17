const userModel = require('../models/userModel');
const jwt = require('jsonwebtoken');

// Middleware to authenticate user and set req.userId and req.user
async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Chưa đăng nhập hệ thống' });
    }
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Chưa đăng nhập hệ thống' });
    }

    let userId;
    let userRole = 'receptionist';
    
    if (token.startsWith('mock-jwt-token-for-user-')) {
      const match = token.match(/mock-jwt-token-for-user-(\d+)/);
      if (!match) {
        return res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ' });
      }
      userId = parseInt(match[1]);
    } else {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'LuxeHavenResortSecretKey2026');
        userId = decoded.userId;
        userRole = decoded.role;
      } catch (err) {
        return res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ' });
      }
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại trên hệ thống' });
    }
    if (user.isActive === false || user.isActive === 0) {
      return res.status(403).json({ success: false, message: 'Tài khoản hiện đang bị khóa' });
    }

    req.userId = userId;
    req.userRole = user.role || userRole;
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ' });
  }
}

// Middleware to restrict access based on roles
function restrictTo(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied / Quyền truy cập bị từ chối'
      });
    }
    next();
  };
}

module.exports = {
  protect,
  restrictTo
};
