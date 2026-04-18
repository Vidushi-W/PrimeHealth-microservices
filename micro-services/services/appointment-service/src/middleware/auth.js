const ApiError = require('../utils/ApiError');

function parseAuthHeaders(req, _res, next) {
  const userId = req.header('x-user-id') || null;
  const role = req.header('x-user-role') || null;
  const email = req.header('x-user-email') || null;
  const uniqueId = req.header('x-user-unique-id') || null;
  const fullName = req.header('x-user-full-name') || null;
  req.user = { id: userId, role, email, uniqueId, fullName };
  next();
}

function requireAuth(req, _res, next) {
  if (!req.user || !req.user.id || !req.user.role) {
    return next(new ApiError(401, 'Missing authentication headers'));
  }
  return next();
}

function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user || !req.user.id || !req.user.role) {
      return next(new ApiError(401, 'Missing authentication headers'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, `Forbidden: requires role "${allowedRoles.join(' or ')}"`));
    }
    return next();
  };
}

function requireInternalServiceToken(req, _res, next) {
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (!expected) {
    return next();
  }

  const provided = req.header('x-internal-service-token');
  if (!provided || provided !== expected) {
    return next(new ApiError(403, 'Forbidden: invalid internal service token'));
  }

  return next();
}

module.exports = { parseAuthHeaders, requireAuth, requireRole, requireInternalServiceToken };
