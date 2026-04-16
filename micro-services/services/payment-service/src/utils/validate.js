const { validationResult } = require('express-validator');
const ApiError = require('./ApiError');

function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  return next(new ApiError(400, 'Validation Error', result.array()));
}

module.exports = validate;
