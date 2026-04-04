const ApiError = require('../utils/ApiError');

function parseAuthHeaders(req, _res, next) {
  const userId = req.header('x-user-id') || null;
  const role = req.header('x-user-role') || null;
  req.user = { id: userId, role };
  next();
}

function requireAuth(req, _res, next) {
  if (!req.user || !req.user.id || !req.user.role) {
    return next(new ApiError(401, 'Missing authentication headers'));
  }
  return next();
}

function requireRole(requiredRole) {
  return (req, _res, next) => {
    if (!req.user || !req.user.id || !req.user.role) {
      return next(new ApiError(401, 'Missing authentication headers'));
    }
    if (req.user.role !== requiredRole) {
      return next(new ApiError(403, `Forbidden: requires role "${requiredRole}"`));
    }
    return next();
  };
}

module.exports = { parseAuthHeaders, requireAuth, requireRole };
