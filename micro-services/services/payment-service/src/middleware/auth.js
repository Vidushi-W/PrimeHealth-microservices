const ApiError = require('../utils/ApiError');

function parseAuthHeaders(req, _res, next) {
  const userId = req.header('x-user-id') || null;
  const role = req.header('x-user-role') || null;
  req.user = { id: userId, role };
  next();
}

function requireRole(...allowedRoles) {
  return function (req, _res, next) {
    if (!req.user || !req.user.role) {
      return next(new ApiError(401, 'Unauthorized — missing user context'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, `Forbidden — requires one of: ${allowedRoles.join(', ')}`));
    }
    next();
  };
}

module.exports = {
  parseAuthHeaders,
  requireRole
};
