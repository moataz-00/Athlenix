const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

// 🛡️ حماية الـ Routes - التحقق من التوكن
exports.verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer Token

    if (!token) {
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // إرفاق بيانات المستخدم مع الطلب
        next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Session expired. Please log in again." });
      }
      
        return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
};

// 🛡️ منع الوصول لصفحة تسجيل الدخول لو المستخدم مسجل دخول بالفعل
exports.preventLoginAccess = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (token) {
        try {
            jwt.verify(token, JWT_SECRET);
            return res.status(403).json({ error: "Already logged in" });
        } catch (error) {
            return next(); // لو التوكن غير صالح، كمل عادي
        }
    }
    next();
};

// 🛡️ التحقق من الصلاحيات (RBAC)
// authMiddleware.js - Update authorize function
exports.authorize = (requiredPermissions) => {
    return (req, res, next) => {
      if (!req.user?.permissions) {
        return res.status(403).json({ error: "Missing permissions data" });
      }
  
      // Allow array of permissions
      const hasPermission = Array.isArray(requiredPermissions) 
        ? requiredPermissions.some(p => req.user.permissions.includes(p))
        : req.user.permissions.includes(requiredPermissions);
  
      if (!hasPermission) {
        return res.status(403).json({
          error: `Forbidden: Requires ${requiredPermissions} permission`
        });
      }
      
      next();
    };
  };
